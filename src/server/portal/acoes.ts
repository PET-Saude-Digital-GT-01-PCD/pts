"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { gerarCodigo, hashCodigo } from "@/server/portal/codigo";
import { COOKIE_PORTAL, lerSessaoPortal } from "@/server/portal/sessao";

// Ações do portal do cidadão (#73, ADR-0012) executadas pela equipe:
// emissão e revogação de código (recurso recepcao.portal.emitir, ambas
// auditadas na transação) e saída da sessão do próprio cidadão.

export type ResultadoAcesso =
  | { ok: true; acessoId: string; codigo: string; link: string; validoAte: Date }
  | { ok: false; erro: string };

const TTL_PADRAO_DIAS = 30;

/** TTL por env (ADR-0012); valor inválido cai no default. */
function ttlDias(): number {
  const bruto = Number(process.env.PORTAL_ACESSO_TTL_DIAS ?? "");
  return Number.isFinite(bruto) && bruto > 0 ? bruto : TTL_PADRAO_DIAS;
}

export async function emitirAcessoPortal(
  pacienteId: string,
): Promise<ResultadoAcesso> {
  const user = await requirePermissao("recepcao.portal.emitir");

  const paciente = await db.paciente.findUnique({
    where: { id: pacienteId },
    select: { id: true, cerId: true, ativo: true },
  });
  if (!paciente) return { ok: false, erro: "Paciente não encontrado." };
  if (paciente.cerId !== user.cerId) {
    return { ok: false, erro: "Paciente fora do CER do usuário." };
  }
  if (!paciente.ativo) {
    return { ok: false, erro: "Paciente inativo não recebe acesso ao portal." };
  }

  const codigo = gerarCodigo();
  const agora = new Date();
  const validoAte = new Date(agora.getTime() + ttlDias() * 24 * 60 * 60 * 1000);

  const acesso = await db.$transaction(async (tx) => {
    // Regra: uma credencial ativa por paciente. Reemitir invalida a anterior —
    // revogar (não apagar) mantém a trilha append-only e é auditado por acesso.
    const ativas = await tx.acessoCidadao.findMany({
      where: {
        pacienteId: paciente.id,
        revogadoEm: null,
        validoAte: { gt: agora },
      },
      select: { id: true, validoAte: true, usadoEm: true },
    });
    for (const anterior of ativas) {
      await tx.acessoCidadao.update({
        where: { id: anterior.id },
        data: { revogadoEm: agora, revogadoPorId: user.id },
      });
      await tx.auditoria.create({
        data: {
          cerId: user.cerId,
          actorId: user.id,
          action: "portal.acesso.revogar",
          entityType: "paciente",
          entityId: paciente.id,
          beforeJson: {
            acessoId: anterior.id,
            validoAte: anterior.validoAte.toISOString(),
            usadoEm: anterior.usadoEm?.toISOString() ?? null,
            motivo: "substituido_por_nova_emissao",
          },
        },
      });
    }

    const criado = await tx.acessoCidadao.create({
      data: {
        pacienteId: paciente.id,
        tokenHash: hashCodigo(codigo),
        emitidoPorId: user.id,
        validoAte,
      },
      select: { id: true },
    });
    await tx.auditoria.create({
      data: {
        cerId: user.cerId,
        actorId: user.id,
        action: "portal.acesso.emitir",
        entityType: "paciente",
        entityId: paciente.id,
        // nunca o código em claro — só a referência e a validade
        afterJson: { acessoId: criado.id, validoAte: validoAte.toISOString() },
      },
    });
    return criado;
  });

  const pts = await db.pts.findFirst({
    where: { pacienteId: paciente.id },
    orderBy: { criadoEm: "desc" },
    select: { id: true },
  });
  const baseUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const link = pts
    ? `${baseUrl}/portal?acesso=${codigo}&pts=${pts.id}`
    : `${baseUrl}/portal?acesso=${codigo}`;

  return { ok: true, acessoId: acesso.id, codigo, link, validoAte };
}

export async function revogarAcessoPortal(
  acessoId: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const user = await requirePermissao("recepcao.portal.emitir");

  const acesso = await db.acessoCidadao.findUnique({
    where: { id: acessoId },
    select: {
      id: true,
      pacienteId: true,
      validoAte: true,
      revogadoEm: true,
      usadoEm: true,
      paciente: { select: { cerId: true } },
    },
  });
  if (!acesso) return { ok: false, erro: "Acesso não encontrado." };
  if (acesso.paciente.cerId !== user.cerId) {
    return { ok: false, erro: "Acesso fora do CER do usuário." };
  }
  if (acesso.revogadoEm) return { ok: true }; // idempotente

  await db.$transaction(async (tx) => {
    await tx.acessoCidadao.update({
      where: { id: acesso.id },
      data: { revogadoEm: new Date(), revogadoPorId: user.id },
    });
    await tx.auditoria.create({
      data: {
        cerId: user.cerId,
        actorId: user.id,
        action: "portal.acesso.revogar",
        entityType: "paciente",
        entityId: acesso.pacienteId,
        beforeJson: {
          acessoId: acesso.id,
          validoAte: acesso.validoAte.toISOString(),
          usadoEm: acesso.usadoEm?.toISOString() ?? null,
        },
      },
    });
  });

  return { ok: true };
}

/** Saída do portal (aparelho compartilhado): audita o fim da sessão e derruba
 * o cookie — a revogação da credencial continua sendo ato da recepção. */
export async function sairDoPortal(): Promise<void> {
  const sessao = await lerSessaoPortal();
  if (sessao) {
    await db.auditoria.create({
      data: {
        cerId: sessao.cerId,
        actorTipo: "CIDADAO",
        actorPacienteId: sessao.pacienteId,
        action: "portal.acesso.sair",
        entityType: "paciente",
        entityId: sessao.pacienteId,
        afterJson: { acessoId: sessao.acessoId },
      },
    });
  }
  const store = await cookies();
  store.delete(COOKIE_PORTAL);
  redirect("/portal");
}
