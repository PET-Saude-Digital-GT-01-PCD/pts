"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import {
  acessoCidadaoVazio,
  type InfoAcessoCidadao,
} from "@/server/care-plan/portal-cidadao-leitura";
import {
  calcularExpiracao,
  gerarCodigo,
  hashCodigo,
  linkCidadao,
} from "@/server/care-plan/portal-cidadao";

// Emissão/revogação do link do cidadão (ADR-0012). O código cru existe só
// aqui, na resposta da action: o banco guarda o hash. Emitir de novo sempre
// revoga o link anterior do mesmo PTS — é o caminho de "não confio mais
// naquele link".
//
// ponytail: 1 link ativo por PTS, sem vários destinatários (paciente e
// cuidador compartilham o mesmo link). Upgrade = campo destinatario +
// escopo por Cuidador quando a recepção precisar separar os acessos.

const TENTATIVAS_CODIGO = 3;

type Resultado = { ok: true } | { ok: false; erro: string };

type ResultadoEmissao =
  | { ok: true; link: string; expiraEm: Date }
  | { ok: false; erro: string };

// ponytail: nada de `export type` aqui — em "use server" todo export vira
// action e o proxy do cliente tenta re-exportar o nome em runtime. Consumidores
// importam `InfoAcessoCidadao` de `portal-cidadao-leitura`.

const EMITIR_SCHEMA = z.object({ ptsId: z.string().uuid() });
const REVOGAR_SCHEMA = z.object({ acessoId: z.string().uuid() });

/** Estado do link para a tela do caso. Não devolve o código (não é recuperável). */
export async function buscarAcessoCidadaoDoPts(
  ptsId: string,
): Promise<InfoAcessoCidadao> {
  const user = await requirePermissao("portal.cidadao.acesso");

  const acesso = await db.acessoCidadao.findFirst({
    where: { ptsId, revogadoEm: null },
    orderBy: { criadoEm: "desc" },
    select: {
      pts: { select: { cerId: true } },
      criadoEm: true,
      expiraEm: true,
      ultimoAcessoEm: true,
      totalAcessos: true,
    },
  });
  if (!acesso || acesso.pts.cerId !== user.cerId) return acessoCidadaoVazio();

  return {
    existe: true,
    valido: acesso.expiraEm.getTime() > Date.now(),
    criadoEm: acesso.criadoEm,
    expiraEm: acesso.expiraEm,
    ultimoAcessoEm: acesso.ultimoAcessoEm,
    totalAcessos: acesso.totalAcessos,
  };
}

/**
 * Gera o link e revoga o anterior do mesmo PTS. O código volta uma única
 * vez, para ser copiado e entregue à recepção.
 */
export async function gerarLinkCidadao(input: unknown): Promise<ResultadoEmissao> {
  const user = await requirePermissao("portal.cidadao.acesso");
  const parsed = EMITIR_SCHEMA.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Caso inválido." };
  const { ptsId } = parsed.data;

  const pts = await db.pts.findUnique({
    where: { id: ptsId },
    select: { id: true, cerId: true, pacienteId: true },
  });
  if (!pts || pts.cerId !== user.cerId) {
    return { ok: false, erro: "Caso não encontrado." };
  }

  const agora = new Date();
  const expiraEm = calcularExpiracao(agora);

  for (let tentativa = 1; tentativa <= TENTATIVAS_CODIGO; tentativa++) {
    const codigo = gerarCodigo();
    try {
      const substitutos = await db.$transaction(async (tx) => {
        const { count } = await tx.acessoCidadao.updateMany({
          where: { ptsId, revogadoEm: null },
          data: { revogadoEm: agora },
        });

        const acesso = await tx.acessoCidadao.create({
          data: {
            ptsId,
            codigoHash: hashCodigo(codigo),
            criadoPorId: user.id,
            expiraEm,
          },
        });

        await tx.auditoria.create({
          data: {
            actorId: user.id,
            action: "acesso_cidadao.gerar",
            entityType: "acesso_cidadao",
            entityId: acesso.id,
            afterJson: { ptsId, expiraEm, linksRevogados: count },
          },
        });

        return count;
      });

      revalidatePath(`/casos/${ptsId}`);
      revalidatePath(`/pacientes/${pts.pacienteId}`);
      if (substitutos > 0) {
        console.log(
          `Link do cidadão do PTS ${ptsId} regenerado: ${substitutos} link(s) anterior(es) revogado(s).`,
        );
      }
      return { ok: true, link: linkCidadao(codigo), expiraEm };
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === "P2002" &&
        tentativa < TENTATIVAS_CODIGO
      ) {
        continue; // colisão de hash: outro código
      }
      return { ok: false, erro: "Erro ao gerar o link de acesso." };
    }
  }

  return { ok: false, erro: "Erro ao gerar o link de acesso." };
}

export async function revogarLinkCidadao(input: unknown): Promise<Resultado> {
  const user = await requirePermissao("portal.cidadao.acesso");
  const parsed = REVOGAR_SCHEMA.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Link inválido." };
  const { acessoId } = parsed.data;

  const acesso = await db.acessoCidadao.findUnique({
    where: { id: acessoId },
    select: {
      id: true,
      ptsId: true,
      revogadoEm: true,
      pts: { select: { cerId: true, pacienteId: true } },
    },
  });
  if (!acesso || acesso.pts.cerId !== user.cerId) {
    return { ok: false, erro: "Link não encontrado." };
  }
  if (acesso.revogadoEm) return { ok: true };

  const agora = new Date();
  await db.$transaction(async (tx) => {
    await tx.acessoCidadao.update({
      where: { id: acesso.id },
      data: { revogadoEm: agora },
    });
    await tx.auditoria.create({
      data: {
        actorId: user.id,
        action: "acesso_cidadao.revogar",
        entityType: "acesso_cidadao",
        entityId: acesso.id,
        beforeJson: { ptsId: acesso.ptsId, ativo: true },
      },
    });
  });

  revalidatePath(`/casos/${acesso.ptsId}`);
  revalidatePath(`/pacientes/${acesso.pts.pacienteId}`);
  return { ok: true };
}
