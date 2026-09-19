import type { StatusPts } from "@prisma/client";

import { db } from "@/lib/db";
import { TRANSICOES_VALIDAS } from "./maquina-status";

// ===== Partes puras (testáveis sem I/O) =====

export type EtapaFluxoId =
  | "RECEPCAO"
  | "TRIAGEM"
  | "EM_AVALIACAO"
  | "PACTACAO"
  | "SEGUIMENTO"
  | "REAVALIACAO"
  | "FECHADO";

export type EtapaFluxo = {
  id: EtapaFluxoId;
  titulo: string;
  /** Uma linha: o que acontece nesta etapa. */
  resumo: string;
  /** Parágrafo curto exibido no painel de detalhe. */
  detalhe: string;
  /** Rótulo da métrica que a etapa mostra (a contagem muda de sentido por etapa). */
  rotuloMetrica: string;
  /** Versão curta do rótulo, para a trilha, onde o espaço é de um cartão. */
  rotuloCurto: string;
  /** Papéis-base do seed que costumam atuar aqui. */
  quemAtua: readonly string[];
  /** Chaves RBAC exigidas para agir na etapa (plano/17). */
  recursos: readonly string[];
  /** Para onde o caso pode seguir a partir daqui. */
  saidas: readonly string[];
  /** Tela onde o trabalho da etapa acontece, quando existe. */
  href?: string;
  hrefRotulo?: string;
};

/**
 * Trilha do cuidado do CER (CONTEXT.md): recepção e triagem antecedem o PTS;
 * do PTS em diante quem manda é a máquina de status.
 * ponytail: catálogo estático — vira configuração por CER só quando um
 * segundo CER precisar de etapas diferentes.
 */
export const ETAPAS_FLUXO: readonly EtapaFluxo[] = [
  {
    id: "RECEPCAO",
    titulo: "Recepção",
    resumo: "Cadastro, cuidador, consentimento LGPD e linha de base.",
    detalhe:
      "Porta de entrada do CER. O paciente é cadastrado (ou regularizado, no caso de PPI provisória), o cuidador é vinculado e o consentimento é registrado antes de qualquer dado clínico.",
    rotuloMetrica: "pacientes cadastrados",
    rotuloCurto: "pacientes",
    quemAtua: ["RECEPCAO"],
    recursos: ["recepcao.paciente.cadastrar", "recepcao.consentimento.registrar"],
    saidas: ["Triagem"],
    href: "/recepcao",
    hrefRotulo: "Abrir recepção",
  },
  {
    id: "TRIAGEM",
    titulo: "Triagem",
    resumo: "Elegibilidade por escopo e classificação do semáforo.",
    detalhe:
      "A triagem aplica a tabela de elegibilidade por CID e classifica o semáforo. Verde segue para contrarreferência quando o caso não é do escopo do CER; amarelo entra na fila de espera; vermelho tem prioridade.",
    rotuloMetrica: "casos aguardando triagem",
    rotuloCurto: "na fila",
    quemAtua: ["TRIADOR"],
    recursos: ["triage.triagem.escrever", "triage.semaforo.ajustar"],
    saidas: ["Em avaliação", "Contrarreferência"],
    href: "/triagem",
    hrefRotulo: "Abrir triagem",
  },
  {
    id: "EM_AVALIACAO",
    titulo: "Em avaliação",
    resumo: "Avaliações por especialidade e SOAP montam o quadro do caso.",
    detalhe:
      "O PTS já existe e recebe as avaliações das especialidades. É a etapa que mais acumula caso quando falta profissional na equipe — o alerta de 60 dias em avaliação nasce aqui.",
    rotuloMetrica: "PTS nesta etapa",
    rotuloCurto: "PTS",
    quemAtua: ["MEDICO", "FISIOTERAPEUTA", "TERAPEUTA_OCUPACIONAL", "PSICOLOGO", "ENFERMEIRO"],
    recursos: ["clinical.avaliacao.escrever", "clinical.soap.escrever"],
    saidas: [],
    href: "/dashboard/casos",
    hrefRotulo: "Ver equipes dos casos",
  },
  {
    id: "PACTACAO",
    titulo: "Pactuação",
    resumo: "Metas SMART combinadas com a família em cogestão.",
    detalhe:
      "As metas são propostas e pactuadas com o paciente e o cuidador. Conflitos entre metas de especialidades diferentes aparecem nesta etapa antes de virarem plano.",
    rotuloMetrica: "PTS nesta etapa",
    rotuloCurto: "PTS",
    quemAtua: ["MEDICO", "FISIOTERAPEUTA", "TERAPEUTA_OCUPACIONAL", "PSICOLOGO", "ENFERMEIRO"],
    recursos: ["care-plan.meta.escrever"],
    saidas: [],
    href: "/metas",
    hrefRotulo: "Abrir metas",
  },
  {
    id: "SEGUIMENTO",
    titulo: "Seguimento",
    resumo: "Execução do plano, eventos de cuidado e mural do caso.",
    detalhe:
      "O plano roda: eventos de cuidado são registrados, o mural mantém a conversa da equipe com a família e as metas avançam de status.",
    rotuloMetrica: "PTS nesta etapa",
    rotuloCurto: "PTS",
    quemAtua: ["MEDICO", "FISIOTERAPEUTA", "TERAPEUTA_OCUPACIONAL", "PSICOLOGO", "ENFERMEIRO"],
    recursos: ["care-plan.meta.escrever", "care-plan.mural.escrever"],
    saidas: [],
  },
  {
    id: "REAVALIACAO",
    titulo: "Reavaliação",
    resumo: "Revisão do PTS: comparativo com a linha de base e decisão.",
    detalhe:
      "A equipe revisa o caso contra a linha de base. Daqui o PTS volta para avaliação (novo ciclo) ou segue para encerramento.",
    rotuloMetrica: "PTS nesta etapa",
    rotuloCurto: "PTS",
    quemAtua: ["MEDICO", "FISIOTERAPEUTA", "TERAPEUTA_OCUPACIONAL", "PSICOLOGO", "ENFERMEIRO"],
    recursos: ["care-plan.pts.revisar"],
    saidas: [],
  },
  {
    id: "FECHADO",
    titulo: "Encerramento",
    resumo: "Alta, contrarreferência e devolutiva para a rede.",
    detalhe:
      "Etapa terminal: o PTS é encerrado com motivo e tipo registrados em auditoria, e a guia de contrarreferência devolve o caso para a rede de origem.",
    rotuloMetrica: "PTS encerrados",
    rotuloCurto: "encerrados",
    quemAtua: ["TRIADOR", "GESTOR"],
    recursos: ["care-plan.pts.encerrar", "triage.contrarreferencia.emissao"],
    saidas: [],
    href: "/governanca",
    hrefRotulo: "Ver indicadores",
  },
];

const STATUS_LABEL: Record<StatusPts, string> = {
  EM_AVALIACAO: "Em avaliação",
  PACTACAO: "Pactuação",
  SEGUIMENTO: "Seguimento",
  REAVALIACAO: "Reavaliação",
  FECHADO: "Encerramento",
};

const STATUS_PTS: readonly StatusPts[] = [
  "EM_AVALIACAO",
  "PACTACAO",
  "SEGUIMENTO",
  "REAVALIACAO",
  "FECHADO",
];

function ehStatusPts(id: EtapaFluxoId): id is StatusPts {
  return (STATUS_PTS as readonly string[]).includes(id);
}

export type ContagensFluxo = {
  pacientes: number;
  aguardandoTriagem: number;
  porStatus: Partial<Record<StatusPts, number>>;
  contrarreferencias: number;
};

export type EtapaFluxoView = EtapaFluxo & {
  total: number;
  /** 0–1: participação da etapa no maior volume do fluxo, para a barra. */
  proporcao: number;
};

/** Saídas de uma etapa do PTS vêm da máquina de status; as demais são fixas. */
function saidasDaEtapa(etapa: EtapaFluxo): readonly string[] {
  if (!ehStatusPts(etapa.id)) return etapa.saidas;
  const validas = TRANSICOES_VALIDAS[etapa.id];
  if (validas.length === 0) return ["Terminal"];
  return validas.map((s) => STATUS_LABEL[s]);
}

function totalDaEtapa(etapa: EtapaFluxo, contagens: ContagensFluxo): number {
  if (etapa.id === "RECEPCAO") return contagens.pacientes;
  if (etapa.id === "TRIAGEM") return contagens.aguardandoTriagem;
  return contagens.porStatus[etapa.id as StatusPts] ?? 0;
}

/**
 * Junta o catálogo de etapas às contagens do CER. Puro: a tela do fluxo só
 * desenha o que sai daqui.
 */
export function montarFluxo(contagens: ContagensFluxo): EtapaFluxoView[] {
  const totais = ETAPAS_FLUXO.map((e) => totalDaEtapa(e, contagens));
  const maior = Math.max(...totais, 0);
  return ETAPAS_FLUXO.map((etapa, i) => ({
    ...etapa,
    saidas: saidasDaEtapa(etapa),
    total: totais[i],
    proporcao: maior === 0 ? 0 : totais[i] / maior,
  }));
}

// ===== Query =====

export type FluxoCuidado = {
  etapas: EtapaFluxoView[];
  contagens: ContagensFluxo;
};

export async function buscarFluxoCuidado(
  cerId: string | null,
): Promise<FluxoCuidado> {
  const escopo = cerId ?? undefined;
  const [pacientes, aguardandoTriagem, porStatus, contrarreferencias] =
    await Promise.all([
      db.paciente.count({ where: { cerId: escopo, ativo: true } }),
      db.pts.count({ where: { cerId: escopo, triagens: { none: {} } } }),
      db.pts.groupBy({
        by: ["status"],
        where: { cerId: escopo },
        _count: { _all: true },
      }),
      db.contrarreferencia.count({ where: { paciente: { cerId: escopo } } }),
    ]);

  const contagens: ContagensFluxo = {
    pacientes,
    aguardandoTriagem,
    porStatus: Object.fromEntries(
      porStatus.map((g) => [g.status, g._count._all]),
    ) as Partial<Record<StatusPts, number>>,
    contrarreferencias,
  };

  return { etapas: montarFluxo(contagens), contagens };
}
