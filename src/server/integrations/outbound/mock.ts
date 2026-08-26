import type { MarcacaoPTS, ReferenciaPTS } from "../canonical";
import type {
  DeliveryReceipt,
  OutboundGateway,
} from "../contract";

// Mock do gateway de saída: sempre aceita, receipt com id/status.

function receipt(status: DeliveryReceipt["status"] = "ACEITO"): DeliveryReceipt {
  return {
    id: crypto.randomUUID(),
    status,
    recebidoEm: new Date().toISOString(),
  };
}

export class MockOutboundGateway implements OutboundGateway {
  async enviarMarcacao(marcacao: MarcacaoPTS): Promise<DeliveryReceipt> {
    void marcacao;
    return receipt();
  }
  async enviarReferencia(referencia: ReferenciaPTS): Promise<DeliveryReceipt> {
    void referencia;
    return receipt();
  }
  async enviarEvento(tipo: string, carga: unknown): Promise<DeliveryReceipt> {
    void tipo;
    void carga;
    return receipt();
  }
}
