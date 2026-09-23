"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requirePermissao } from "@/server/iam/session";

const idSchema = z.string().uuid();

export type ResultadoReprocessamento =
  | { ok: true }
  | { ok: false; erro: string };

export async function reprocessarEventoOutbound(
  eventoId: string,
): Promise<ResultadoReprocessamento> {
  const user = await requirePermissao("admin.config.org.editar");
  const parsedId = idSchema.safeParse(eventoId);
  if (!parsedId.success) {
    return { ok: false, erro: "Evento inválido." };
  }

  const resultado = await db.$transaction(async (tx) => {
    const evento = await tx.outboundEvent.findUnique({
      where: { id: parsedId.data },
      select: { id: true, status: true, attempts: true, lastError: true },
    });
    if (!evento) return { ok: false as const, erro: "Evento não encontrado." };
    if (evento.status !== "FAILED") {
      return {
        ok: false as const,
        erro: "Só é possível reprocessar eventos com falha definitiva.",
      };
    }

    const atualizacao = await tx.outboundEvent.updateMany({
      where: { id: evento.id, status: "FAILED" },
      data: {
        status: "PENDING",
        attempts: 0,
        nextRetryAt: new Date(),
        lockedUntil: null,
        lastError: null,
        processadoEm: null,
      },
    });
    if (atualizacao.count !== 1) {
      return {
        ok: false as const,
        erro: "O evento já foi alterado. Atualize a tela.",
      };
    }
    await tx.auditoria.create({
      data: {
        actorId: user.id,
        action: "outbound_event.reprocessar",
        entityType: "outbound_event",
        entityId: evento.id,
        beforeJson: {
          status: evento.status,
          attempts: evento.attempts,
          lastError: evento.lastError,
        },
        afterJson: { status: "PENDING", attempts: 0 },
      },
    });
    return { ok: true as const };
  });

  if (resultado.ok) revalidatePath("/dashboard/integracoes");
  return resultado;
}
