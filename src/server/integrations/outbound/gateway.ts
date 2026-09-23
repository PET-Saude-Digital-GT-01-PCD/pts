import { createHash } from "node:crypto";

export type EventoParaEnvio = {
  id: string;
  tipo: string;
  payloadJson: unknown;
};

const TIMEOUT_MS = 8_000;

/**
 * Adapter HTTP genérico para um gateway de integração. O evento é enviado
 * com chave idempotente para que o receptor possa deduplicar reentregas.
 * Respostas e corpos remotos nunca são gravados: podem conter dados sensíveis.
 */
export async function enviarEventoAoGateway(evento: EventoParaEnvio): Promise<void> {
  const endpoint = process.env.OUTBOUND_WEBHOOK_URL;
  if (!endpoint) {
    throw new Error("Gateway outbound não configurado (OUTBOUND_WEBHOOK_URL).");
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Gateway outbound configurado com URL inválida.");
  }
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("Gateway outbound em produção exige HTTPS.");
  }

  const secret = process.env.OUTBOUND_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("Gateway outbound sem autenticação configurada.");
  }
  const chaveIdempotencia = createHash("sha256")
    .update(evento.id)
    .digest("hex");

  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": chaveIdempotencia,
        ...(secret ? { authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({
        id: evento.id,
        tipo: evento.tipo,
        payload: evento.payloadJson,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (erro) {
    if (erro instanceof Error && erro.name === "TimeoutError") {
      throw new Error("Gateway outbound excedeu o tempo limite.");
    }
    throw new Error("Não foi possível conectar ao gateway outbound.");
  }

  await resposta.body?.cancel().catch(() => undefined);
  if (!resposta.ok) {
    throw new Error(`Gateway outbound respondeu HTTP ${resposta.status}.`);
  }
}
