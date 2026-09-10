"use server";

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireAuth, recursosDoUsuario, type SessaoUsuario } from "@/server/iam/session";
import {
  paraCsv,
  periodoPadrao,
  type IndicadorGovernanca,
  type PeriodoRelatorio,
} from "@/server/governance/indicadores";

// Painel de indicadores (#72, plano/09 §19–37). North Star + input/health
// metrics. Cada indicador documenta a fórmula e a fonte de dado no comentário
// da função que o calcula — é o que "fonte de dado rastreável" (critério de
// aceite) significa aqui. ponytail: alguns indicadores dependem da fila de
// integração outbound (#63/#64), que ainda não está em main — marcados
// disponivel:false até essa dependência entrar, em vez de inventar número.

// OR de permissões: dashboard.ver OU relatorios.ver, conforme a issue.
async function exigirVisaoGovernanca(): Promise<SessaoUsuario> {
  const user = await requireAuth();
  const recursos = await recursosDoUsuario(user.papelId);
  const chaves = ["governanca.dashboard.ver", "governanca.relatorios.ver"];
  if (!chaves.some((c) => recursos.includes(c))) redirect("/");
  return user;
}

const DIA_MS = 24 * 60 * 60 * 1000;

const CADENCIA_REVISAO_DIAS = 90; // ponytail: sem SLA formal de cadência ainda; ajustar quando o piloto definir

/**
 * North Star (plano/09): % de PTS ativos com revisão em dia (último marco
 * PtsRevisao — ou a abertura, se nenhum marco existir — dentro de
 * CADENCIA_REVISAO_DIAS) E ≥1 meta cadastrada (toda Meta já nasce com
 * critérios SMART, ver meta-schema.ts). Fonte: pts, pts_revisao, meta.
 */
async function calcularNorthStar(agora: Date): Promise<IndicadorGovernanca> {
  const ptsAtivos = await db.pts.findMany({
    where: { status: { not: "FECHADO" } },
    select: {
      aberturaEm: true,
      revisoes: { select: { data: true }, orderBy: { data: "desc" }, take: 1 },
      _count: { select: { metas: true } },
    },
  });

  if (ptsAtivos.length === 0) {
    return {
      id: "north-star",
      titulo: "PTS ativos com revisão em dia e ≥1 meta",
      valor: null,
      unidade: "%",
      meta: 100,
      maiorEhMelhor: true,
      fonte: "pts, pts_revisao, meta",
      disponivel: false,
    };
  }

  const limite = agora.getTime() - CADENCIA_REVISAO_DIAS * DIA_MS;
  const emDia = ptsAtivos.filter((p) => {
    const ultimoMarco = p.revisoes[0]?.data ?? p.aberturaEm;
    return ultimoMarco.getTime() >= limite && p._count.metas > 0;
  }).length;

  return {
    id: "north-star",
    titulo: "PTS ativos com revisão em dia e ≥1 meta",
    valor: Math.round((emDia / ptsAtivos.length) * 1000) / 10,
    unidade: "%",
    meta: 100,
    maiorEhMelhor: true,
    fonte: "pts, pts_revisao, meta",
    disponivel: true,
  };
}

/** Cobertura de baseline: % de pacientes com PTS ativo que têm baseline importada. Fonte: paciente, baseline, pts. */
async function calcularCoberturaBaseline(): Promise<IndicadorGovernanca> {
  const pacientesComPtsAtivo = await db.paciente.findMany({
    where: { pts: { some: { status: { not: "FECHADO" } } } },
    select: { baseline: { select: { id: true } } },
  });

  if (pacientesComPtsAtivo.length === 0) {
    return {
      id: "cobertura-baseline",
      titulo: "Cobertura de baseline",
      valor: null,
      unidade: "%",
      meta: 100,
      maiorEhMelhor: true,
      fonte: "paciente, baseline",
      disponivel: false,
    };
  }

  const comBaseline = pacientesComPtsAtivo.filter((p) => p.baseline !== null).length;
  return {
    id: "cobertura-baseline",
    titulo: "Cobertura de baseline",
    valor: Math.round((comBaseline / pacientesComPtsAtivo.length) * 1000) / 10,
    unidade: "%",
    meta: 100,
    maiorEhMelhor: true,
    fonte: "paciente, baseline",
    disponivel: true,
  };
}

/** Metas por PTS (≥80%): % de PTS ativos com ≥1 meta cadastrada. Fonte: pts, meta. */
async function calcularMetasPorPts(): Promise<IndicadorGovernanca> {
  const ptsAtivos = await db.pts.findMany({
    where: { status: { not: "FECHADO" } },
    select: { _count: { select: { metas: true } } },
  });

  if (ptsAtivos.length === 0) {
    return {
      id: "metas-por-pts",
      titulo: "PTS ativos com ao menos 1 meta",
      valor: null,
      unidade: "%",
      meta: 80,
      maiorEhMelhor: true,
      fonte: "pts, meta",
      disponivel: false,
    };
  }

  const comMeta = ptsAtivos.filter((p) => p._count.metas > 0).length;
  return {
    id: "metas-por-pts",
    titulo: "PTS ativos com ao menos 1 meta",
    valor: Math.round((comMeta / ptsAtivos.length) * 1000) / 10,
    unidade: "%",
    meta: 80,
    maiorEhMelhor: true,
    fonte: "pts, meta",
    disponivel: true,
  };
}

/** Adesão (≥70%): % de eventos de cuidado no período que são SESSAO (não FALTA). Fonte: evento_cuidado. */
async function calcularAdesao(periodo: PeriodoRelatorio): Promise<IndicadorGovernanca> {
  const eventos = await db.eventoCuidado.groupBy({
    by: ["tipo"],
    where: { data: { gte: periodo.desde, lte: periodo.ate }, tipo: { in: ["SESSAO", "FALTA"] } },
    _count: { _all: true },
  });

  const sessoes = eventos.find((e) => e.tipo === "SESSAO")?._count._all ?? 0;
  const faltas = eventos.find((e) => e.tipo === "FALTA")?._count._all ?? 0;
  const total = sessoes + faltas;

  return {
    id: "adesao",
    titulo: "Adesão (sessões realizadas vs. faltas)",
    valor: total === 0 ? null : Math.round((sessoes / total) * 1000) / 10,
    unidade: "%",
    meta: 70,
    maiorEhMelhor: true,
    fonte: "evento_cuidado",
    disponivel: total > 0,
  };
}

/** Tempo até 1ª avaliação multiprofissional: média de dias entre abertura do PTS e a 1ª avaliação, para PTS abertos no período. Fonte: pts, avaliacao. */
async function calcularTempoPrimeiraAvaliacao(
  periodo: PeriodoRelatorio,
): Promise<IndicadorGovernanca> {
  const ptsDoPeriodo = await db.pts.findMany({
    where: { aberturaEm: { gte: periodo.desde, lte: periodo.ate } },
    select: {
      aberturaEm: true,
      avaliacoes: { select: { criadaEm: true }, orderBy: { criadaEm: "asc" }, take: 1 },
    },
  });

  const comAvaliacao = ptsDoPeriodo.filter((p) => p.avaliacoes.length > 0);
  if (comAvaliacao.length === 0) {
    return {
      id: "tempo-primeira-avaliacao",
      titulo: "Tempo até a 1ª avaliação multiprofissional",
      valor: null,
      unidade: "dias",
      meta: 7,
      maiorEhMelhor: false,
      fonte: "pts, avaliacao",
      disponivel: false,
    };
  }

  const somaDias = comAvaliacao.reduce((acc, p) => {
    const dias = (p.avaliacoes[0]!.criadaEm.getTime() - p.aberturaEm.getTime()) / DIA_MS;
    return acc + dias;
  }, 0);

  return {
    id: "tempo-primeira-avaliacao",
    titulo: "Tempo até a 1ª avaliação multiprofissional",
    valor: Math.round((somaDias / comAvaliacao.length) * 10) / 10,
    unidade: "dias",
    meta: 7,
    maiorEhMelhor: false,
    fonte: "pts, avaliacao",
    disponivel: true,
  };
}

/** Taxa de divergência manual (>30% = alerta): % de triagens no período com ao menos 1 ajuste manual de classificação. Fonte: triagem, ajuste_classificacao. */
async function calcularDivergenciaManual(
  periodo: PeriodoRelatorio,
): Promise<IndicadorGovernanca> {
  const triagens = await db.triagem.findMany({
    where: { criadaEm: { gte: periodo.desde, lte: periodo.ate } },
    select: { _count: { select: { ajustes: true } } },
  });

  if (triagens.length === 0) {
    return {
      id: "divergencia-manual",
      titulo: "Taxa de divergência manual (ajuste de classificação)",
      valor: null,
      unidade: "%",
      meta: 30,
      maiorEhMelhor: false,
      fonte: "triagem, ajuste_classificacao",
      disponivel: false,
    };
  }

  const comAjuste = triagens.filter((t) => t._count.ajustes > 0).length;
  return {
    id: "divergencia-manual",
    titulo: "Taxa de divergência manual (ajuste de classificação)",
    valor: Math.round((comAjuste / triagens.length) * 1000) / 10,
    unidade: "%",
    meta: 30,
    maiorEhMelhor: false,
    fonte: "triagem, ajuste_classificacao",
    disponivel: true,
  };
}

// Indicadores que dependem da fila outbound (#63/#64 — OutboundEvent), ainda
// não em main: sem fonte de dado real, não fabricamos número.
function indicadoresIndisponiveis(): IndicadorGovernanca[] {
  return [
    {
      id: "tempo-recepcao",
      titulo: "Tempo de recepção (cadastro ≤ 2min)",
      valor: null,
      unidade: "min",
      meta: 2,
      maiorEhMelhor: false,
      fonte: "requer instrumentação de sessão (não coletada nesta versão)",
      disponivel: false,
    },
    {
      id: "pendencia-sync",
      titulo: "Pendência de sincronização (>24h)",
      valor: null,
      unidade: "h",
      meta: 24,
      maiorEhMelhor: false,
      fonte: "outbound_event — depende de #63/#64 (fila de integração), ainda não integrado",
      disponivel: false,
    },
    {
      id: "erro-integracao",
      titulo: "Taxa de erro de integração (>10%)",
      valor: null,
      unidade: "%",
      meta: 10,
      maiorEhMelhor: false,
      fonte: "outbound_event — depende de #63/#64 (fila de integração), ainda não integrado",
      disponivel: false,
    },
  ];
}

export type PainelIndicadores = {
  periodo: PeriodoRelatorio;
  indicadores: IndicadorGovernanca[];
};

export async function buscarIndicadores(
  periodoInput?: { desde?: Date; ate?: Date },
): Promise<PainelIndicadores> {
  await exigirVisaoGovernanca();

  const agora = new Date();
  const padrao = periodoPadrao(agora);
  const periodo: PeriodoRelatorio = {
    desde: periodoInput?.desde ?? padrao.desde,
    ate: periodoInput?.ate ?? padrao.ate,
  };

  const [northStar, coberturaBaseline, metasPorPts, adesao, tempoPrimeiraAvaliacao, divergenciaManual] =
    await Promise.all([
      calcularNorthStar(agora),
      calcularCoberturaBaseline(),
      calcularMetasPorPts(),
      calcularAdesao(periodo),
      calcularTempoPrimeiraAvaliacao(periodo),
      calcularDivergenciaManual(periodo),
    ]);

  return {
    periodo,
    indicadores: [
      northStar,
      coberturaBaseline,
      metasPorPts,
      adesao,
      tempoPrimeiraAvaliacao,
      divergenciaManual,
      ...indicadoresIndisponiveis(),
    ],
  };
}

export async function exportarCsv(periodoInput?: {
  desde?: Date;
  ate?: Date;
}): Promise<string> {
  const { indicadores } = await buscarIndicadores(periodoInput);
  return paraCsv(indicadores);
}
