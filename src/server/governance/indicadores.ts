import { z } from "zod";

export type StatusIndicador = "OK" | "ATENCAO" | "SEM_DADO";
export type PeriodoRelatorio = { desde: string; ate: string };
export type FiltroRelatorio = { desde?: string; ate?: string; cadenciaRevisaoDias?: number };
export const FUSO_RELATORIO = "America/Fortaleza";
const DIA_MS = 86_400_000;
const DESLOCAMENTO_MS = 3 * 60 * 60 * 1000;

const dataCivil = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((valor) => {
  const data = new Date(`${valor}T03:00:00.000Z`);
  return valor >= "0001-01-01" && valor <= "9999-12-31"
    && Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === valor;
}, "Data inválida.");

const filtroSchema = z.object({
  desde: dataCivil.optional(),
  ate: dataCivil.optional(),
  cadenciaRevisaoDias: z.number().int().min(1).max(365).default(90),
}).strict().refine((filtro) => Boolean(filtro.desde) === Boolean(filtro.ate), {
  message: "Informe as duas datas do período.",
}).refine((filtro) => !filtro.desde || !filtro.ate || filtro.desde <= filtro.ate, {
  message: "A data inicial deve preceder ou coincidir com a final.",
});

/** Últimos 30 dias civis inclusivos em Fortaleza (UTC-03), incluindo hoje. */
export function periodoPadrao(agora: Date = new Date()): PeriodoRelatorio {
  const hoje = new Date(agora.getTime() - DESLOCAMENTO_MS).toISOString().slice(0, 10);
  const inicioHoje = new Date(`${hoje}T03:00:00.000Z`);
  return { desde: new Date(inicioHoje.getTime() - 29 * DIA_MS).toISOString().slice(0, 10), ate: hoje };
}

export function validarFiltroRelatorio(input: unknown, agora: Date = new Date()): {
  periodo: PeriodoRelatorio;
  cadenciaRevisaoDias: number;
} {
  const filtro = filtroSchema.parse(input === undefined ? {} : input);
  return {
    periodo: filtro.desde && filtro.ate ? { desde: filtro.desde, ate: filtro.ate } : periodoPadrao(agora),
    cadenciaRevisaoDias: filtro.cadenciaRevisaoDias,
  };
}

/** Intervalo [início, dia seguinte ao fim), sem perder milissegundos. */
export function limitesPeriodo(periodo: PeriodoRelatorio): { desde: Date; ateExclusivo: Date } {
  return {
    desde: new Date(`${periodo.desde}T03:00:00.000Z`),
    ateExclusivo: new Date(new Date(`${periodo.ate}T03:00:00.000Z`).getTime() + DIA_MS),
  };
}

export function classificarIndicador(valor: number | null, meta: number, maiorEhMelhor: boolean): StatusIndicador {
  if (valor === null) return "SEM_DADO";
  return (maiorEhMelhor ? valor >= meta : valor <= meta) ? "OK" : "ATENCAO";
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
  escopoTemporal: "ATUAL" | "PERIODO" | "INDISPONIVEL";
  formula: string;
  descricaoTemporal: string;
};

type DefinicaoIndicador = Omit<IndicadorGovernanca, "id" | "valor" | "disponivel">;

// Definições efetivas do MVP: metas já existentes são preservadas. ATUAL não
// reconstrói estado histórico; PERIODO seleciona eventos ou coortes por data.
const DEFINICOES = {
  "north-star": {
    titulo: "PTS ativos com revisão em dia e ≥1 meta", unidade: "%", meta: 100, maiorEhMelhor: true,
    fonte: "pts, pts_revisao, meta", escopoTemporal: "ATUAL",
    formula: "100 × PTS ativos com última revisão (ou abertura) dentro da cadência escolhida e ≥1 meta cadastrada ÷ PTS ativos",
    descricaoTemporal: "Estado atual na geração; todas as metas cadastradas contam, independentemente do status. A cadência é contada em dias de 24 horas.",
  },
  "cobertura-baseline": {
    titulo: "Cobertura de baseline", unidade: "%", meta: 100, maiorEhMelhor: true,
    fonte: "paciente, baseline, pts", escopoTemporal: "ATUAL",
    formula: "100 × pacientes com PTS ativo e baseline cadastrada ÷ pacientes com PTS ativo",
    descricaoTemporal: "Estado atual na geração; presença de baseline, sem avaliar conteúdo clínico nem completude da importação.",
  },
  "metas-por-pts": {
    titulo: "PTS ativos com ao menos 1 meta", unidade: "%", meta: 80, maiorEhMelhor: true,
    fonte: "pts, meta", escopoTemporal: "ATUAL",
    formula: "100 × PTS ativos com ≥1 meta cadastrada ÷ PTS ativos",
    descricaoTemporal: "Estado atual na geração; todas as metas cadastradas contam, independentemente do status. PTS ativo significa status diferente de FECHADO.",
  },
  "adesao": {
    titulo: "Adesão (sessões realizadas vs. faltas)", unidade: "%", meta: 70, maiorEhMelhor: true,
    fonte: "evento_cuidado", escopoTemporal: "PERIODO",
    formula: "100 × eventos SESSAO ÷ (eventos SESSAO + eventos FALTA)",
    descricaoTemporal: "Eventos pela data do atendimento no período inclusivo; CANCELAMENTO e OUTRO não entram. Mede sessões versus faltas, não cobertura de registro da agenda.",
  },
  "tempo-primeira-avaliacao": {
    titulo: "Tempo até a 1ª avaliação multiprofissional", unidade: "dias", meta: 7, maiorEhMelhor: false,
    fonte: "pts, avaliacao", escopoTemporal: "PERIODO",
    formula: "Soma dos dias de 24 horas entre abertura do PTS e primeira avaliação cadastrada ÷ PTS da coorte que possuem avaliação",
    descricaoTemporal: "Coorte de PTS abertos no período; considera a primeira avaliação cadastrada, inclusive após o fim do período. PTS sem avaliação não entram na média.",
  },
  "divergencia-manual": {
    titulo: "Taxa de divergência manual (ajuste de classificação)", unidade: "%", meta: 30, maiorEhMelhor: false,
    fonte: "triagem, ajuste_classificacao", escopoTemporal: "PERIODO",
    formula: "100 × triagens da coorte com ≥1 ajuste manual cadastrado ÷ triagens da coorte",
    descricaoTemporal: "Coorte de triagens criadas no período; ajustes cadastrados após o fim do período também contam. Cada triagem conta uma vez.",
  },
  "tempo-recepcao": {
    titulo: "Tempo de recepção (cadastro ≤ 2min)", unidade: "min", meta: 2, maiorEhMelhor: false,
    fonte: "duração das sessões de recepção — instrumentação não coletada", escopoTemporal: "INDISPONIVEL",
    formula: "Soma das durações de recepção ÷ recepções concluídas",
    descricaoTemporal: "Sem instrumentação de duração nesta versão; valor indisponível.",
  },
  "pendencia-sync": {
    titulo: "Pendência de sincronização (>24h)", unidade: "h", meta: 24, maiorEhMelhor: false,
    fonte: "fila de sincronização offline por CER — não instrumentada", escopoTemporal: "INDISPONIVEL",
    formula: "Horas de espera do registro offline pendente mais antigo",
    descricaoTemporal: "A fila outbound existente não mede sincronização offline por CER; valor indisponível.",
  },
  "erro-integracao": {
    titulo: "Taxa de erro de integração (>10%)", unidade: "%", meta: 10, maiorEhMelhor: false,
    fonte: "chamadas e-SUS por CER — instrumentação não coletada", escopoTemporal: "INDISPONIVEL",
    formula: "100 × chamadas e-SUS com falha ÷ chamadas e-SUS realizadas",
    descricaoTemporal: "A fila outbound não fornece denominador de chamadas e-SUS com escopo CER; valor indisponível.",
  },
} satisfies Record<string, DefinicaoIndicador>;

export type IdIndicador = keyof typeof DEFINICOES;

export function montarIndicador(id: IdIndicador, valor: number | null): IndicadorGovernanca {
  return { id, ...DEFINICOES[id], valor, disponivel: valor !== null };
}

export type RelatorioGovernanca = {
  snapshotId: string;
  geradoEm: string;
  cer: { id: string; nome: string };
  periodo: PeriodoRelatorio;
  cadenciaRevisaoDias: number;
  indicadores: IndicadorGovernanca[];
};

type CelulaCsv = string | number | null;

/** Texto livre é protegido contra fórmulas; números mantêm seu tipo e sinal. */
function escaparCsv(valor: CelulaCsv): string {
  if (valor === null) return "";
  if (typeof valor === "number") return String(valor).replace(".", ",");
  const protegido = /^[\s\uFEFF]*[=+\-@]/u.test(valor) || /^[\t\r\n]/u.test(valor) ? `'${valor}` : valor;
  return /[;"\r\n]/u.test(protegido) ? `"${protegido.replace(/"/g, '""')}"` : protegido;
}

function linhaCsv(valores: CelulaCsv[]): string {
  return valores.map(escaparCsv).join(";");
}

/** Tabela retangular pt-BR: BOM UTF-8, ponto e vírgula, decimais com vírgula, CRLF. */
export function paraCsv(relatorio: RelatorioGovernanca): string {
  const linhas = [
    linhaCsv([
      "cer", "cer_id", "periodo_inicial", "periodo_final_inclusivo", "fuso_horario", "gerado_em_utc",
      "snapshot_id", "cadencia_revisao_dias", "indicador_id", "indicador", "valor", "unidade", "meta",
      "sentido_meta", "status", "disponivel", "escopo_temporal", "formula", "criterio_temporal", "fonte",
    ]),
    ...relatorio.indicadores.map((ind) => linhaCsv([
      relatorio.cer.nome,
      relatorio.cer.id,
      relatorio.periodo.desde,
      relatorio.periodo.ate,
      FUSO_RELATORIO,
      relatorio.geradoEm,
      relatorio.snapshotId,
      relatorio.cadenciaRevisaoDias,
      ind.id,
      ind.titulo,
      ind.disponivel ? ind.valor : null,
      ind.unidade,
      ind.meta,
      ind.maiorEhMelhor ? "≥" : "≤",
      ind.disponivel ? classificarIndicador(ind.valor, ind.meta, ind.maiorEhMelhor) : "SEM_DADO",
      ind.disponivel ? "Sim" : "Não",
      ind.escopoTemporal,
      ind.formula,
      ind.descricaoTemporal,
      ind.fonte,
    ])),
  ];
  return `\uFEFF${linhas.join("\r\n")}\r\n`;
}
