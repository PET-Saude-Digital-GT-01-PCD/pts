"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { requireAuth, recursosDoUsuario } from "@/server/iam/session";
import { podeAcessarCaso } from "@/server/shared/acesso-caso";
import {
  semaforoDeReuniao,
  type EntradaReuniao,
} from "@/server/care-plan/semaforo-reuniao";

export type Resultado =
  | { ok: true; classificacao: "VERDE" | "AMARELO" | "VERMELHO" }
  | { ok: false; erro: string; codigo?: number };

class ConflitoVersao extends Error {
  readonly codigo = 409;
}

const entradaSchema = z.object({
  ptsId: z.string().uuid(),
  divergenciaEspecialidades: z.boolean(),
  conflitosMeta: z.number().int().min(0),
  eventoRisco: z.boolean(),
  pendenciaAjuste: z.boolean(),
  // Lock otimista: versão do PTS conhecida pelo cliente.
  version: z.number().int().min(0),
});

export async function atualizarSemaforoReuniao(
  input: unknown,
  motivo?: string,
): Promise<Resultado> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  if (!recursos.includes("care-plan.pts.revisar")) {
    return { ok: false, erro: "Sem permissão para revisar este caso." };
  }

  const parsed = entradaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: "Dados inválidos para o semáforo de reunião." };
  }

  const { ptsId, version, ...dados } = parsed.data;

  if (!(await podeAcessarCaso(user.id, ptsId))) {
    return { ok: false, erro: "Você não está vinculado a este caso." };
  }

  const entrada: EntradaReuniao = dados;
  const classificacao = semaforoDeReuniao(entrada);

  try {
    await db.$transaction(async (tx) => {
      const atual = await tx.pts.findUniqueOrThrow({
        where: { id: ptsId },
        select: { semaforoReuniao: true, versao: true },
      });

      const atualizado = await tx.pts.updateMany({
        where: { id: ptsId, versao: version },
        data: { semaforoReuniao: classificacao, versao: version + 1 },
      });
      if (atualizado.count === 0) {
        throw new ConflitoVersao(
          "Conflito de versão: o PTS foi alterado por outra pessoa. Recarregue a página.",
        );
      }

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "pts.semaforo_reuniao",
          entityType: "pts",
          entityId: ptsId,
          beforeJson: atual,
          afterJson: { ...entrada, classificacao, versao: version + 1 },
          motivo,
        },
      });
    });

    return { ok: true, classificacao };
  } catch (e) {
    if (e instanceof ConflitoVersao) {
      return { ok: false, erro: e.message, codigo: e.codigo };
    }
    return { ok: false, erro: "Erro ao atualizar o semáforo de reunião." };
  }
}
