"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import {
  semaforoDeReuniao,
  type EntradaReuniao,
} from "@/server/care-plan/semaforo-reuniao";

const entradaSchema = z.object({
  divergenciaEspecialidades: z.boolean(),
  conflitosMeta: z.number().int().min(0),
  eventoRisco: z.boolean(),
  pendenciaAjuste: z.boolean(),
});

export type ResultadoSemaforo =
  | { ok: true }
  | { ok: false; erro: string; conflito?: boolean };

export async function atualizarSemaforoReuniao(
  ptsId: string,
  entrada: unknown,
  motivo?: string,
  versaoEsperada?: number,
): Promise<ResultadoSemaforo> {
  const user = await requirePermissao("care-plan.pts.revisar");
  const parsed = entradaSchema.safeParse(entrada);
  if (!parsed.success) {
    return { ok: false, erro: "Dados inválidos para o semáforo de reunião." };
  }

  const dados: EntradaReuniao = parsed.data;
  const classificacao = semaforoDeReuniao(dados);

  try {
    await db.$transaction(async (tx) => {
      const where = versaoEsperada === undefined
        ? { id: ptsId }
        : { id: ptsId, versao: versaoEsperada };

      const resultado = await tx.pts.updateMany({
        where,
        data: {
          semaforoReuniao: classificacao,
          // ponytail: increment cego — sem checagem de teto; revisões do PTS é quem reabre ciclo
          versao: { increment: 1 },
        },
      });

      if (resultado.count === 0) {
        throw new Error("CONFLITO_VERSAO");
      }

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "care-plan.semaforo_reuniao.atualizar",
          entityType: "pts",
          entityId: ptsId,
          afterJson: { ...dados, classificacao },
          motivo,
        },
      });
    });

    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "CONFLITO_VERSAO") {
      return {
        ok: false,
        erro: "O caso foi alterado por outra pessoa. Recarregue e tente de novo.",
        conflito: true,
      };
    }
    return { ok: false, erro: "Erro ao atualizar semáforo de reunião." };
  }
}
