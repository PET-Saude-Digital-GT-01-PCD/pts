// Fila outbound persistida (ADR-0006): INSERT dentro da MESMA transação da
// mutação de negócio que gera o efeito externo — se a mutação faz rollback,
// o evento nunca existiu. `worker.ts` reserva e entrega os eventos com
// SKIP LOCKED e retry.

import { createHash } from "node:crypto";
import type { Prisma, TipoOutboundEvent } from "@prisma/client";

export type ResultadoEnfileiramento = { id: string; duplicado: boolean };

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Idempotência por hash serializada com advisory lock: concorrência no mesmo
 * payload não cria duas linhas, e falhas são retomadas pelo reprocessamento.
 */
export async function enfileirarOutbound(
  tx: Prisma.TransactionClient,
  tipo: TipoOutboundEvent,
  payload: unknown,
  cerId: string,
): Promise<ResultadoEnfileiramento> {
  const payloadHash = hashPayload(payload);
  // Dedup e advisory lock escopados por CER: payloads idênticos em unidades
  // diferentes não colidem entre si.
  const chaveLock = `${cerId}:${tipo}:${payloadHash}`;

  await tx.$queryRaw<Array<{ locked: number }>>`
    WITH lock AS MATERIALIZED (
      SELECT pg_advisory_xact_lock(hashtextextended(${chaveLock}, 0))
    )
    SELECT 1::int AS locked FROM lock
  `;

  const existente = await tx.outboundEvent.findFirst({
    where: { tipo, payloadHash, cerId },
    select: { id: true },
  });
  if (existente) return { id: existente.id, duplicado: true };

  const evento = await tx.outboundEvent.create({
    data: {
      cerId,
      tipo,
      payloadJson: payload as Prisma.InputJsonValue,
      payloadHash,
      status: "PENDING",
    },
  });
  return { id: evento.id, duplicado: false };
}
