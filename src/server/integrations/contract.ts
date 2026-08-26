import type {
  BaselinePaciente,
  MarcacaoPTS,
  ReferenciaPTS,
} from "./canonical";

// Re-exporta tipos canônicos: núcleo clínico importa só daqui ou de ./canonical.
export type { BaselinePaciente, MarcacaoPTS, ReferenciaPTS } from "./canonical";

export type DeliveryReceipt = {
  id: string;
  status: "ACEITO" | "RECUSADO";
  recebidoEm: string;
};

/** Porta de entrada: busca linha de base clínica (e-SUS/RNDS/arquivo/mock). */
export interface BaselineSource {
  /** null = identificador desconhecido na fonte. Erro = fonte indisponível. */
  getBaseline(identificador: string): Promise<BaselinePaciente | null>;
}

/**
 * Porta de saída: envio de marcações/referências/eventos para fora.
 * Fluxo clínico nunca trava por indisponibilidade do gateway (ADR-0008).
 */
export interface OutboundGateway {
  enviarMarcacao(marcacao: MarcacaoPTS): Promise<DeliveryReceipt>;
  enviarReferencia(referencia: ReferenciaPTS): Promise<DeliveryReceipt>;
  enviarEvento(tipo: string, carga: unknown): Promise<DeliveryReceipt>;
}
