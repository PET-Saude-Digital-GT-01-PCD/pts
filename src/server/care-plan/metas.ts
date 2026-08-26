"use server";

import { revalidatePath } from "next/cache";
import type { StatusMeta } from "@prisma/client";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import {
  metaInputSchema,
  transicaoStatusValida,
} from "@/server/care-plan/meta-schema";

type Resultado = { ok: boolean; erro?: string; conflito?: boolean };

export async function criarMeta(input: unknown): Promise<Resultado> {
  const user = await requirePermissao("care-plan.meta.escrever");
  const parsed = metaInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      erro: "Dados inválidos: descreva a meta em dupla linguagem (técnica e acessível), com critérios SMART e prazo.",
    };
  }
  const dados = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      const ptsExiste = await tx.pts.findUnique({
        where: { id: dados.ptsId },
        select: { id: true },
      });
      if (!ptsExiste) throw new Error("PTS_INEXISTENTE");

      const meta = await tx.meta.create({
        data: {
          ptsId: dados.ptsId,
          avaliacaoId: dados.avaliacaoId,
          donoId: dados.donoId,
          descTecnica: dados.descTecnica,
          descAcessivel: dados.descAcessivel,
          criteriosJson: dados.criteriosJson as object,
          prazo: dados.prazo,
        },
      });

      await tx.metaStatusHistorico.create({
        data: { metaId: meta.id, de: null, para: "NOVA", autorId: user.id },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "care-plan.meta.criar",
          entityType: "meta",
          entityId: meta.id,
          afterJson: {
            ptsId: dados.ptsId,
            donoId: dados.donoId,
            prazo: dados.prazo.toISOString(),
          },
        },
      });
    });

    revalidatePath(`/casos/${dados.ptsId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "PTS_INEXISTENTE") {
      return { ok: false, erro: "PTS não encontrado." };
    }
    return { ok: false, erro: "Erro ao criar meta." };
  }
}

export async function mudarStatusMeta(
  metaId: string,
  novoStatus: StatusMeta,
  motivo?: string,
  versaoEsperada?: number,
): Promise<Resultado> {
  const user = await requirePermissao("care-plan.meta.escrever");

  try {
    let ptsId: string | undefined;
    await db.$transaction(async (tx) => {
      const meta = await tx.meta.findUnique({
        where: { id: metaId },
        select: { id: true, ptsId: true, status: true, versao: true },
      });
      if (!meta) throw new Error("META_INEXISTENTE");
      ptsId = meta.ptsId;

      if (!transicaoStatusValida(meta.status, novoStatus)) {
        throw new Error(
          `Transição inválida de ${meta.status} para ${novoStatus}.`,
        );
      }

      const where =
        versaoEsperada === undefined
          ? { id: metaId }
          : { id: metaId, versao: versaoEsperada };
      const atualizada = await tx.meta.updateMany({
        where,
        data: { status: novoStatus, versao: { increment: 1 } },
      });
      if (atualizada.count === 0) throw new Error("CONFLITO_VERSAO");

      await tx.metaStatusHistorico.create({
        data: {
          metaId,
          de: meta.status,
          para: novoStatus,
          autorId: user.id,
          motivo,
        },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "care-plan.meta.status",
          entityType: "meta",
          entityId: metaId,
          beforeJson: { status: meta.status },
          afterJson: { status: novoStatus },
          motivo,
        },
      });
    });

    if (ptsId) revalidatePath(`/casos/${ptsId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error) {
      if (e.message === "CONFLITO_VERSAO") {
        return {
          ok: false,
          erro: "A meta foi alterada por outra pessoa. Recarregue e tente de novo.",
          conflito: true,
        };
      }
      if (
        e.message === "META_INEXISTENTE" ||
        e.message.startsWith("Transição inválida")
      ) {
        return { ok: false, erro: e.message };
      }
    }
    return { ok: false, erro: "Erro ao mudar status da meta." };
  }
}
