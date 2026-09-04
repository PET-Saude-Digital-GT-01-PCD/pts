import type { StatusMeta, StatusPts } from "@prisma/client";

// Portal do cidadão (#73, plano/03 §3.7, tela 14): formatação pura da
// visão em linguagem acessível — sem termos clínicos, sem "use server"
// (regra do projeto: arquivo "use server" só exporta função async).

// Ordem linear de exibição do percurso. ponytail: REAVALIACAO pode voltar
// para EM_AVALIACAO (novo ciclo) — quando isso acontece a barra reinicia
// do começo em vez de manter as etapas antigas marcadas; aceitável para um
// indicador visual simples de "onde você está agora".
const ORDEM_PERCURSO: readonly StatusPts[] = [
  "EM_AVALIACAO",
  "PACTACAO",
  "SEGUIMENTO",
  "REAVALIACAO",
  "FECHADO",
];

export const LABEL_ETAPA_PERCURSO: Record<StatusPts, string> = {
  EM_AVALIACAO: "Conhecendo você",
  PACTACAO: "Combinando as metas",
  SEGUIMENTO: "Acompanhamento",
  REAVALIACAO: "Revendo o combinado",
  FECHADO: "Concluído",
};

export type SituacaoEtapa = "concluida" | "atual" | "a_fazer";

export type EtapaPercurso = {
  chave: StatusPts;
  label: string;
  situacao: SituacaoEtapa;
};

export function montarPercurso(statusAtual: StatusPts): EtapaPercurso[] {
  const indiceAtual = ORDEM_PERCURSO.indexOf(statusAtual);
  return ORDEM_PERCURSO.map((chave, indice) => ({
    chave,
    label: LABEL_ETAPA_PERCURSO[chave],
    situacao:
      indice < indiceAtual
        ? "concluida"
        : indice === indiceAtual
          ? "atual"
          : "a_fazer",
  }));
}

export const LABEL_STATUS_META_ACESSIVEL: Record<StatusMeta, string> = {
  NOVA: "Combinada",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Conquistada!",
  NAO_ALCANCADA: "Não alcançada ainda",
};
