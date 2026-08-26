// Base da fila outbound (ADR-0006): evento canônico enfileirado na mesma
// transação da mutação. Worker + retry + persistência são Fase 2.
// ponytail: fila em memória; upgrade = tabela outbound_event + worker quando
// a Fase 2 chegar.

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
