// Adapter em memória mantido para testes unitários. A aplicação usa
// `persistida.ts`; o worker e os retries operam sobre outbound_event no PG.

export type EventoOutbound = {
  id: string;
  tipo: string;
  criadoEm: string;
  carga: unknown;
};

export interface FilaOutbound {
  enfileirar(tipo: string, carga: unknown): EventoOutbound;
  drenar(): EventoOutbound[];
}

export function criarFilaMemoria(): FilaOutbound {
  const fila: EventoOutbound[] = [];
  return {
    enfileirar(tipo: string, carga: unknown) {
      const evento: EventoOutbound = {
        id: crypto.randomUUID(),
        tipo,
        criadoEm: new Date().toISOString(),
        carga,
      };
      fila.push(evento);
      return evento;
    },
    drenar() {
      return fila.splice(0, fila.length);
    },
  };
}
