"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { exigirUmaDas } from "@/server/care-plan/acesso";
import { compararRevisoes, type ComparativoRevisoes } from "@/server/care-plan/comparativo";

type Resultado =
  | { ok: true; revisaoId: string; numero: number }
  | { ok: false; erro: string };

const registrarSchema = z.object({
  ptsId: z.string().uuid(),
  motivo: z.string().trim().min(1, "Informe o motivo da revisão.").max(500),
});

export async function registrarRevisao(input: unknown): Promise<Resultado> {
  let user;
  try {
    user = await exigirUmaDas(["care-plan.pts.revisar"]);
  } catch {
    return { ok: false, erro: "Sem permissão para registrar revisão." };
  }

  const parsed = registrarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };
  const { ptsId, motivo } = parsed.data;

  try {
    const resultado = await db.$transaction(async (tx) => {
      const pts = await tx.pts.findUnique({ where: { id: ptsId }, select: { id: true } });
      if (!pts) throw new Error("PTS não encontrado.");

      // ponytail: checagem-então-insere tem janela de corrida; unique
      // (ptsId, numero) no banco é o upgrade quando houver concorrência real.
      const ultima = await tx.ptsRevisao.findFirst({
        where: { ptsId },
        orderBy: { numero: "desc" },
        select: { numero: true },
      });
      const numero = (ultima?.numero ?? 0) + 1;

      const revisao = await tx.ptsRevisao.create({
        data: { ptsId, numero, motivo, revisadoPorId: user.id },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "pts.revisao.criar",
          entityType: "pts_revisao",
          entityId: revisao.id,
          afterJson: { ptsId, numero, motivo },
        },
      });

      return { id: revisao.id, numero };
    });

    return { ok: true, revisaoId: resultado.id, numero: resultado.numero };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao registrar revisão.",
    };
  }
}

export type MarcoRevisao = {
  id: string;
  numero: number;
  motivo: string;
  data: Date;
  revisorNome: string;
};

export async function listarRevisoes(ptsId: string): Promise<MarcoRevisao[]> {
  try {
    await exigirUmaDas(["care-plan.pts.revisar"]);
  } catch {
    return [];
  }

  const revisoes = await db.ptsRevisao.findMany({
    where: { ptsId },
    orderBy: { numero: "asc" },
    select: {
      id: true,
      numero: true,
      motivo: true,
      data: true,
      revisadoPor: { select: { nome: true } },
    },
  });

  return revisoes.map((r) => ({
    id: r.id,
    numero: r.numero,
    motivo: r.motivo,
    data: r.data,
    revisorNome: r.revisadoPor.nome,
  }));
}

type ResultadoComparativo =
  | { ok: true; comparativo: ComparativoRevisoes }
  | { ok: false; erro: string };

export async function buscarComparativo(
  ptsId: string,
  revisaoDeId: string,
  revisaoParaId: string,
): Promise<ResultadoComparativo> {
  try {
    await exigirUmaDas(["care-plan.pts.revisar"]);
  } catch {
    return { ok: false, erro: "Sem permissão para ver o comparativo." };
  }

  const [de, para] = await Promise.all([
    db.ptsRevisao.findUnique({ where: { id: revisaoDeId }, select: { data: true, ptsId: true } }),
    db.ptsRevisao.findUnique({ where: { id: revisaoParaId }, select: { data: true, ptsId: true } }),
  ]);
  if (!de || !para || de.ptsId !== ptsId || para.ptsId !== ptsId) {
    return { ok: false, erro: "Revisões inválidas para este caso." };
  }
  if (de.data.getTime() >= para.data.getTime()) {
    return { ok: false, erro: "A revisão inicial deve ser anterior à final." };
  }

  const [historicoMetas, avaliacoes, ajustes, auditoriasSemaforo] = await Promise.all([
    db.metaStatusHistorico.findMany({
      where: { meta: { ptsId } },
      orderBy: { data: "asc" },
      select: {
        metaId: true,
        de: true,
        para: true,
        data: true,
        motivo: true,
        meta: { select: { descTecnica: true } },
      },
    }),
    db.avaliacao.findMany({
      where: { ptsId },
      orderBy: { criadaEm: "asc" },
      select: { id: true, especialidade: true, criadaEm: true },
    }),
    db.ajusteClassificacao.findMany({
      where: { triagem: { ptsId } },
      orderBy: { data: "asc" },
      select: { id: true, de: true, para: true, data: true, motivo: true },
    }),
    db.auditoria.findMany({
      where: { entityType: "pts", entityId: ptsId, action: "pts.semaforo_reuniao" },
      orderBy: { criadaEm: "asc" },
      select: { criadaEm: true, afterJson: true },
    }),
  ]);

  const comparativo = compararRevisoes(de.data, para.data, {
    metas: historicoMetas.map((h) => ({
      metaId: h.metaId,
      descTecnica: h.meta.descTecnica,
      de: h.de,
      para: h.para,
      data: h.data,
      motivo: h.motivo,
    })),
    avaliacoes,
    ajustesClassificacao: ajustes,
    semaforoReuniao: auditoriasSemaforo.map((a) => ({
      data: a.criadaEm,
      classificacao:
        (a.afterJson as { classificacao?: string } | null)?.classificacao ?? "—",
    })),
  });

  return { ok: true, comparativo };
}
