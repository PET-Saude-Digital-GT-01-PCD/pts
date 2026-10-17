import { cookies } from "next/headers";

import { db } from "@/lib/db";
import {
  codigoValido,
  ehUuid,
  hashCodigo,
  normalizarCodigo,
} from "@/server/portal/codigo";

// Sessão do portal do cidadão (#73, ADR-0012): o cookie guarda o próprio
// código (HttpOnly) — validado a cada request contra o hash no banco.
// Assim revogação/expiração derrubam a sessão imediatamente, sem tabela de
// sessão separada. As trocas de código por sessão são auditadas aqui
// (actorTipo CIDADAO, entityType "paciente"); renders não.

export const COOKIE_PORTAL = "portal_acesso";

export type SessaoPortal = {
  acessoId: string;
  pacienteId: string;
  cerId: string;
  validoAte: Date;
};

export type ResultadoEntrada =
  | {
      ok: true;
      codigo: string;
      /** null enquanto o paciente ainda não tem PTS (ainda sem caso aberto). */
      ptsId: string | null;
      pacienteId: string;
      validoAte: Date;
    }
  | { ok: false; erro: string };

type AcessoValido = NonNullable<Awaited<ReturnType<typeof buscarAcesso>>>;

/** Erro único p/ código inexistente, expirado ou revogado — não vaza
 * existência de credencial (obs.: miss com hash desconhecido não gera
 * auditoria; a entropia do código é o rate limit, ver ADR-0012). */
const ERRO_ENTRADA = "Código inválido ou expirado. Confira com a equipe.";

async function buscarAcesso(codigo: string) {
  return db.acessoCidadao.findUnique({
    where: { tokenHash: hashCodigo(codigo) },
    select: {
      id: true,
      pacienteId: true,
      validoAte: true,
      revogadoEm: true,
      paciente: { select: { ativo: true, cerId: true } },
    },
  });
}

async function acessoValido(codigo: string): Promise<AcessoValido | null> {
  const acesso = await buscarAcesso(codigo);
  if (!acesso) return null;
  if (acesso.revogadoEm) return null;
  if (acesso.validoAte.getTime() <= Date.now()) return null;
  if (!acesso.paciente.ativo) return null;
  return acesso;
}

/** Lê o cookie e valida contra o banco. Sem efeito colateral: a entrada já é
 * auditada na troca de código por sessão (`validarCodigoParaEntrada`). */
export async function lerSessaoPortal(): Promise<SessaoPortal | null> {
  const store = await cookies();
  const bruto = store.get(COOKIE_PORTAL)?.value;
  if (!bruto) return null;
  const codigo = normalizarCodigo(bruto);
  if (!codigoValido(codigo)) return null;
  const acesso = await acessoValido(codigo);
  if (!acesso) return null;
  return {
    acessoId: acesso.id,
    pacienteId: acesso.pacienteId,
    cerId: acesso.paciente.cerId,
    validoAte: acesso.validoAte,
  };
}

/**
 * Troca o código digitado/QR por uma sessão: valida, resolve o PTS (o da
 * URL quando pertencer ao paciente, senão o mais recente) e audita a entrada
 * na mesma transação do `usadoEm`. Quem chama grava o cookie.
 */
export async function validarCodigoParaEntrada(
  entrada: string,
  ptsSugerido?: string | null,
): Promise<ResultadoEntrada> {
  const codigo = normalizarCodigo(entrada);
  if (!codigoValido(codigo)) return { ok: false, erro: ERRO_ENTRADA };

  const acesso = await acessoValido(codigo);
  if (!acesso) return { ok: false, erro: ERRO_ENTRADA };

  let ptsId: string | null = null;
  if (ptsSugerido && ehUuid(ptsSugerido)) {
    const pts = await db.pts.findFirst({
      where: { id: ptsSugerido, pacienteId: acesso.pacienteId },
      select: { id: true },
    });
    ptsId = pts?.id ?? null;
  }
  if (!ptsId) {
    const pts = await db.pts.findFirst({
      where: { pacienteId: acesso.pacienteId },
      orderBy: { criadoEm: "desc" },
      select: { id: true },
    });
    // Sem PTS ainda (caso não aberto ou paciente não elegível): a credencial
    // é do paciente, não do PTS (ADR-0012 §Escopo), então a entrada continua
    // válida e o portal mostra "aguardando avaliação" — nunca o erro genérico
    // de "código inválido" para um código legitimamente emitido na recepção.
    ptsId = pts?.id ?? null;
  }

  await db.$transaction(async (tx) => {
    await tx.acessoCidadao.update({
      where: { id: acesso.id },
      data: { usadoEm: new Date() },
    });
    await tx.auditoria.create({
      data: {
        cerId: acesso.paciente.cerId,
        actorTipo: "CIDADAO",
        actorPacienteId: acesso.pacienteId,
        action: "portal.acesso.entrar",
        entityType: "paciente",
        entityId: acesso.pacienteId,
        afterJson: { acessoId: acesso.id, ptsId },
      },
    });
  });

  return {
    ok: true,
    codigo,
    ptsId,
    pacienteId: acesso.pacienteId,
    validoAte: acesso.validoAte,
  };
}
