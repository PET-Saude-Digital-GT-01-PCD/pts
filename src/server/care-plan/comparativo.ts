// Comparativo entre marcos de revisão (#70, ADR-0004): pts_revisao é um
// marco imutável — o comparativo é sempre DERIVADO das trilhas vivas
// (meta_status_historico, avaliacao, ajuste_classificacao, auditoria do
// semáforo de reunião), nunca um snapshot copiado. Pura — testável sem I/O;
// quem busca as trilhas no banco é o wrapper em revisao.ts.

export type EventoMeta = {
  metaId: string;
  descTecnica: string;
  de: string | null;
  para: string;
  data: Date;
  motivo: string | null;
};

export type EventoAvaliacao = {
  id: string;
  especialidade: string;
  criadaEm: Date;
};

export type EventoAjusteClassificacao = {
  id: string;
  de: string;
  para: string;
  data: Date;
  motivo: string;
};

export type EventoSemaforoReuniao = {
  data: Date;
  classificacao: string;
};

export type TrilhasCaso = {
  metas: EventoMeta[];
  avaliacoes: EventoAvaliacao[];
  ajustesClassificacao: EventoAjusteClassificacao[];
  semaforoReuniao: EventoSemaforoReuniao[];
};

export type ComparativoRevisoes = {
  desde: Date;
  ate: Date;
  metas: EventoMeta[];
  avaliacoes: EventoAvaliacao[];
  ajustesClassificacao: EventoAjusteClassificacao[];
  semaforoReuniao: EventoSemaforoReuniao[];
};

// Janela (desde, ate]: o evento que marcou a própria revisão "desde" não é
// "o que mudou depois dela"; o evento no instante exato de "ate" já conta
// (ex.: algo registrado junto com o fechamento do marco N+1).
function entreMarcos(data: Date, desde: Date, ate: Date): boolean {
  return data.getTime() > desde.getTime() && data.getTime() <= ate.getTime();
}

export function compararRevisoes(
  desde: Date,
  ate: Date,
  trilhas: TrilhasCaso,
): ComparativoRevisoes {
  return {
    desde,
    ate,
    metas: trilhas.metas.filter((e) => entreMarcos(e.data, desde, ate)),
    avaliacoes: trilhas.avaliacoes.filter((e) => entreMarcos(e.criadaEm, desde, ate)),
    ajustesClassificacao: trilhas.ajustesClassificacao.filter((e) =>
      entreMarcos(e.data, desde, ate),
    ),
    semaforoReuniao: trilhas.semaforoReuniao.filter((e) => entreMarcos(e.data, desde, ate)),
  };
}
