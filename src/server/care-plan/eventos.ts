"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { exigirUmaDas } from "@/server/care-plan/acesso";
import { podeAcessarCaso } from "@/server/shared/acesso-caso";

type Resultado =
  | { ok: true; eventoId: string }
  | { ok: false; erro: string };

const registrarEventoSchema = z.object({
  ptsId: z.string().uuid(),
  tipo: z.enum(["SESSAO", "FALTA", "CANCELAMENTO", "OUTRO"]),
  data: z.coerce.date(),
  observacao: z.string().trim().max(500).optional(),
});

export async function registrarEvento(input: unknown): Promise<Resultado> {
  const user = await exigirUmaDas([
    "care-plan.pts.revisar",
    "clinical.avaliacao.escrever",
  ]);

  const parsed = registrarEventoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Dados inválidos." };

  const { ptsId, tipo, data, observacao } = parsed.data;

  if (!(await podeAcessarCaso(user.id, ptsId))) {
    return { ok: false, erro: "Você não está vinculado a este caso." };
  }

  try {
    const eventoId = await db.$transaction(async (tx) => {
      const pts = await tx.pts.findUnique({
        where: { id: ptsId },
        select: { status: true },
      });
      if (!pts) throw new Error("PTS não encontrado.");
      if (pts.status === "FECHADO") {
        throw new Error(
          "PTS fechado é somente leitura; não registra novos eventos.",
        );
      }

      const evento = await tx.eventoCuidado.create({
        data: { ptsId, tipo, data, observacao, registradoPorId: user.id },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "evento_cuidado.registrar",
          entityType: "evento_cuidado",
          entityId: evento.id,
          afterJson: { ptsId, tipo, data, observacao },
        },
      });

      return evento.id;
    });

    return { ok: true, eventoId };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao registrar o evento.",
    };
  }
}

// Alerta simples de faltas recentes para o ref profissional
// (ponytail: janela fixa de 30 dias; notificação real é Fase 2).
export async function temFaltaRecente(ptsId: string): Promise<boolean> {
  const limite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const falta = await db.eventoCuidado.findFirst({
    where: { ptsId, tipo: "FALTA", data: { gte: limite } },
    select: { id: true },
  });
  return falta !== null;
}
