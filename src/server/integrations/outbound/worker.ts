import type { OutboundEvent } from "@prisma/client";

import { db } from "@/lib/db";
import { enviarEventoAoGateway } from "./gateway";

const TENTATIVAS_MAXIMAS = 5;
const TAMANHO_LOTE_MAXIMO = 10;
const LEASE_MS = 60_000;
const ESPERA_BASE_MS = 5 * 60_000;
const ESPERA_MAXIMA_MS = 30 * 60_000;

type ItemWorker = Pick<
  OutboundEvent,
  "id" | "tipo" | "payloadJson" | "attempts" | "lockedUntil"
>;

function esperaParaRetry(tentativa: number): number {
  return Math.min(ESPERA_BASE_MS * 2 ** (tentativa - 1), ESPERA_MAXIMA_MS);
}

function mensagemDeFalha(erro: unknown): string {
  if (erro instanceof Error) {
    if (/^Gateway outbound respondeu HTTP \d+\.$/.test(erro.message)) {
      return erro.message;
    }
    if (
      [
        "Gateway outbound não configurado (OUTBOUND_WEBHOOK_URL).",
        "Gateway outbound configurado com URL inválida.",
        "Gateway outbound em produção exige HTTPS.",
        "Gateway outbound sem autenticação configurada.",
        "Gateway outbound excedeu o tempo limite.",
        "Não foi possível conectar ao gateway outbound.",
      ].includes(erro.message)
    ) {
      return erro.message;
    }
  }
  return "Falha desconhecida ao entregar evento.";
}

/**
 * Reserva um lote em transação curta. SKIP LOCKED permite várias invocações
 * simultâneas; PROCESSING + lockedUntil recupera reservas deixadas por crash.
 */
async function reservarLote(limite: number): Promise<ItemWorker[]> {
  return db.$transaction(async (tx) => {
    const candidatos = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "outbound_event"
      WHERE (
        "status" = 'PENDING'::"StatusOutboundEvent"
        AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW())
      ) OR (
        "status" = 'PROCESSING'::"StatusOutboundEvent"
        AND "lockedUntil" <= NOW()
      )
      ORDER BY "criadoEm" ASC
      LIMIT ${limite}
      FOR UPDATE SKIP LOCKED
    `;
    if (candidatos.length === 0) return [];

    const ids = candidatos.map(({ id }) => id);
    const lockedUntil = new Date(Date.now() + LEASE_MS);
    await tx.outboundEvent.updateMany({
      where: { id: { in: ids } },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        lockedUntil,
      },
    });
    return tx.outboundEvent.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        tipo: true,
        payloadJson: true,
        attempts: true,
        lockedUntil: true,
      },
    });
  });
}

async function entregar(item: ItemWorker): Promise<boolean> {
  try {
    await enviarEventoAoGateway({
      id: item.id,
      tipo: item.tipo,
      payloadJson: item.payloadJson,
    });
    await db.outboundEvent.updateMany({
      where: { id: item.id, status: "PROCESSING", lockedUntil: item.lockedUntil },
      data: {
        status: "SENT",
        lastError: null,
        nextRetryAt: null,
        lockedUntil: null,
        processadoEm: new Date(),
      },
    });
    return true;
  } catch (erro) {
    const esgotouTentativas = item.attempts >= TENTATIVAS_MAXIMAS;
    const espera = esperaParaRetry(item.attempts);
    await db.outboundEvent.updateMany({
      where: { id: item.id, status: "PROCESSING", lockedUntil: item.lockedUntil },
      data: {
        status: esgotouTentativas ? "FAILED" : "PENDING",
        lastError: mensagemDeFalha(erro),
        nextRetryAt: esgotouTentativas
          ? null
          : new Date(Date.now() + espera),
        lockedUntil: null,
        processadoEm: esgotouTentativas ? new Date() : null,
      },
    });
    return false;
  }
}

export type ResultadoWorker = {
  reservados: number;
  enviados: number;
  falhas: number;
};

/** Processa um lote limitado; pode ser chamado por cron ou execução manual. */
export async function processarFilaOutbound(
  tamanhoLote = 5,
): Promise<ResultadoWorker> {
  const limite = Math.max(
    1,
    Math.min(TAMANHO_LOTE_MAXIMO, Math.floor(tamanhoLote)),
  );
  const itens = await reservarLote(limite);
  let enviados = 0;
  for (const item of itens) {
    if (await entregar(item)) enviados += 1;
  }
  return {
    reservados: itens.length,
    enviados,
    falhas: itens.length - enviados,
  };
}
