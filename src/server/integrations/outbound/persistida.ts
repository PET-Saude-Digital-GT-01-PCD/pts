// Fila outbound persistida (ADR-0006): INSERT dentro da MESMA transação da
// mutação de negócio que gera o efeito externo — se a mutação faz rollback,
// o evento nunca existiu. Worker de entrega (SELECT ... FOR UPDATE SKIP
// LOCKED + retry/backoff) é Fase 2; aqui só a persistência + enfileiramento.

import { createHash } from "node:crypto";
import type { Prisma, TipoOutboundEvent } from "@prisma/client";

export type ResultadoEnfileiramento = { id: string; duplicado: boolean };

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Idempotência por hash: se já existe um evento PENDING/SENT do mesmo tipo
 * com o mesmo payload, reaproveita em vez de duplicar o envio.
 */
export async function enfileirarOutbound(
  tx: Prisma.TransactionClient,
  tipo: TipoOutboundEvent,
  payload: unknown,
): Promise<ResultadoEnfileiramento> {
  const payloadHash = hashPayload(payload);

  const existente = await tx.outboundEvent.findFirst({
    where: { tipo, payloadHash, status: { in: ["PENDING", "SENT"] } },
    select: { id: true },
  });
  if (existente) return { id: existente.id, duplicado: true };

  const evento = await tx.outboundEvent.create({
    data: {
      tipo,
      payloadJson: payload as Prisma.InputJsonValue,
      payloadHash,
      status: "PENDING",
    },
  });
  return { id: evento.id, duplicado: false };
}
