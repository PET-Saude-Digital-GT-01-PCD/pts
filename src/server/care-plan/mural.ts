"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";
import { muralInputSchema } from "@/server/care-plan/mural-schema";

type Resultado = { ok: boolean; erro?: string };

// ponytail: paginação fixa (últimos 100); paginar por cursor se murais crescerem
export async function listarMural(ptsId: string) {
  await requirePermissao("care-plan.mural.ler");
  return db.discussao.findMany({
    where: { ptsId },
    orderBy: { criadaEm: "desc" },
    take: 100,
    select: {
      id: true,
      texto: true,
      criadaEm: true,
      autor: { select: { nome: true, categoria: true } },
    },
  });
}

export async function comentarMural(ptsId: string, input: unknown): Promise<Resultado> {
  const user = await requirePermissao("care-plan.mural.escrever");
  const parsed = muralInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: "Comentário vazio ou muito longo." };
  }

  try {
    await db.$transaction(async (tx) => {
      const ptsExiste = await tx.pts.findUnique({
        where: { id: ptsId },
        select: { id: true },
      });
      if (!ptsExiste) throw new Error("PTS_INEXISTENTE");

      // Mural NÃO altera dado clínico nem bumpa versão do PTS — só registra discussão.
      const comentario = await tx.discussao.create({
        data: { ptsId, autorId: user.id, texto: parsed.data.texto },
      });

      await tx.auditoria.create({
        data: {
          actorId: user.id,
          action: "care-plan.mural.comentar",
          entityType: "discussao",
          entityId: comentario.id,
          afterJson: { ptsId },
        },
      });
    });

    revalidatePath(`/casos/${ptsId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "PTS_INEXISTENTE") {
      return { ok: false, erro: "PTS não encontrado." };
    }
    return { ok: false, erro: "Erro ao registrar comentário." };
  }
}
