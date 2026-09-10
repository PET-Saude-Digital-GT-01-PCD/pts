// Indicadores de governança (#72, plano/09 §19–37). North Star + input/health
// metrics. Puro: classificação de status e serialização CSV — as queries de
// agregação (fonte de dado) ficam em relatorios.ts, que monta o objeto que
// estas funções consomem.

export type StatusIndicador = "OK" | "ATENCAO" | "SEM_DADO";

export type PeriodoRelatorio = { desde: Date; ate: Date };

const DIA_MS = 24 * 60 * 60 * 1000;

export function periodoPadrao(agora: Date = new Date()): PeriodoRelatorio {
  return { desde: new Date(agora.getTime() - 30 * DIA_MS), ate: agora };
}

/**
 * valor null (sem dado) → SEM_DADO.
 * maiorEhMelhor=true (ex.: adesão ≥70%): valor >= meta → OK.
 * maiorEhMelhor=false (ex.: pendência de sync ≤24h): valor <= meta → OK.
 */
export function classificarIndicador(
  valor: number | null,
  meta: number,
  maiorEhMelhor: boolean,
): StatusIndicador {
  if (valor === null) return "SEM_DADO";
  const dentroDaMeta = maiorEhMelhor ? valor >= meta : valor <= meta;
  return dentroDaMeta ? "OK" : "ATENCAO";
}

export type IndicadorGovernanca = {
  id: string;
  titulo: string;
  valor: number | null;
  unidade: string;
  meta: number;
  maiorEhMelhor: boolean;
  fonte: string;
  disponivel: boolean;
};

function escaparCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export function paraCsv(indicadores: IndicadorGovernanca[]): string {
  const cabecalho = ["indicador", "valor", "unidade", "meta", "status", "fonte"];
  const linhas = indicadores.map((ind) => {
    const status = ind.disponivel
      ? classificarIndicador(ind.valor, ind.meta, ind.maiorEhMelhor)
      : "SEM_DADO";
    return [
      ind.titulo,
      ind.valor === null ? "" : String(ind.valor),
      ind.unidade,
      String(ind.meta),
      status,
      ind.fonte,
    ]
      .map(escaparCsv)
      .join(",");
  });
  return [cabecalho.join(","), ...linhas].join("\n");
}
