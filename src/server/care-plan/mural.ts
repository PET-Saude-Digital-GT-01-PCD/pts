"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  assertPtsMutavel,
  exigirUmaDas,
  temUmaDas,
} from "@/server/care-plan/acesso";
import { muralInputSchema } from "@/server/care-plan/mural-schema";

type Resultado =
  | { ok: true }
  | { ok: false; erro: string; codigo?: number };

export type ComentarioMural = {
  id: string;
  texto: string;
  criadaEm: Date;
  autorNome: string;
};

// ponytail: paginação fixa (últimos 100); paginar por cursor se murais crescerem
export async function listarMural(ptsId: string): Promise<ComentarioMural[]> {
  if (!(await temUmaDas(["care-plan.mural.ler"]))) return [];
  const rows = await db.discussao.findMany({
    where: { ptsId },
    orderBy: { criadaEm: "desc" },
    take: 100,
    select: {
      id: true,
      texto: true,
      criadaEm: true,
      autor: { select: { nome: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    texto: r.texto,
    criadaEm: r.criadaEm,
    autorNome: r.autor.nome,
  }));
}

// Mural NÃO altera dado clínico nem bumpa versão do PTS — só registra discussão.
export async function comentarMural(input: unknown): Promise<Resultado> {
  let user;
  try {
    user = await exigirUmaDas(["care-plan.mural.escrever"]);
  } catch {
    return { ok: false, erro: "Sem permissão para participar do mural." };
  }

  const schema = z.object({
    ptsId: z.string().uuid(),
    texto: muralInputSchema.shape.texto,
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: "Comentário vazio ou muito longo." };
  }
  const { ptsId, texto } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      await assertPtsMutavel(ptsId, tx);

      const comentario = await tx.discussao.create({
        data: { ptsId, autorId: user.id, texto },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "mural.comentar",
          entityType: "discussao",
          entityId: comentario.id,
          afterJson: { ptsId },
        },
      });
    });

    return { ok: true };
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025"
    ) {
      return { ok: false, erro: "PTS não encontrado." };
    }
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Erro ao registrar comentário.",
    };
  }
}
