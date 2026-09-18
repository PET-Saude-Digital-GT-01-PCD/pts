// Orquestração da entrada de reunião do painel do caso (issue #16 / plano/13
// §11): agrega os sinais puros já existentes (conflito de metas, divergência
// SOAP, alertas de prazo/tempo aberto) e monta EntradaReuniao. Pura — sem I/O,
// testável sem banco.

import type { CategoriaProfissional, StatusMeta, StatusPts } from "@prisma/client";
import {
  verificarConflitoMetas,
  type MetaParaConflito,
} from "@/server/care-plan/conflitos";
import { alertasDoCaso } from "@/server/care-plan/dashboard";
import {
  semaforoDeReuniao,
  type EntradaReuniao,
} from "@/server/care-plan/semaforo-reuniao";
import {
  calcularDivergencia,
  type EntradaAvaliacao,
  type EntradaRelato,
} from "@/server/clinical/divergencia";

export type PtsParaResumo = {
  id: string;
  status: StatusPts;
  aberturaEm: Date;
  metas: {
    id: string;
    status: StatusMeta;
    dataPactuacao: Date;
    prazo: Date;
    criteriosJson: unknown;
    dono: { categoria: CategoriaProfissional | null };
  }[];
  avaliacoes: {
    especialidade: string;
    dadosJson: unknown;
  }[];
};

export type ResumoCaso = {
  entradaReuniao: EntradaReuniao;
  sugestaoSemaforo: ReturnType<typeof semaforoDeReuniao>;
};

export function montarResumoCaso(
  pts: PtsParaResumo,
  faltaRecente: boolean,
  agora: Date = new Date(),
): ResumoCaso {
  const metasParaConflito: MetaParaConflito[] = pts.metas.map((m) => {
    const criterios = m.criteriosJson as Record<string, unknown> | null;
    const dominioFuncional =
      criterios && typeof criterios.dominioFuncional === "string"
        ? criterios.dominioFuncional
        : null;
    return {
      id: m.id,
      ptsId: pts.id,
      status: m.status,
      dataPactuacao: m.dataPactuacao,
      prazo: m.prazo,
      dominioFuncional,
      donoCategoria: m.dono.categoria,
    };
  });
  const conflitosMeta = verificarConflitoMetas(metasParaConflito).length;

  const divergenciaEspecialidades = pts.avaliacoes
    .filter((a) => a.especialidade === "SOAP")
    .some((a) => {
      const dados = (a.dadosJson ?? {}) as Record<string, unknown>;
      const itens = calcularDivergencia(
        (dados.relato ?? {}) as EntradaRelato,
        (dados.avaliacaoClinica ?? {}) as EntradaAvaliacao,
      );
      return itens.some((d) => d.grau === "ALTA" || d.grau === "MEDIA");
    });

  // pendenciaAjuste reusa os mesmos alertas do dashboard (meta vencida /
  // caso parado em avaliação) — sinal de "precisa de atenção" já existente.
  const pendenciaAjuste =
    alertasDoCaso(
      { status: pts.status, aberturaEm: pts.aberturaEm },
      pts.metas.map((m) => ({ prazo: m.prazo, status: m.status })),
      agora,
    ).length > 0;

  const entradaReuniao: EntradaReuniao = {
    divergenciaEspecialidades,
    conflitosMeta,
    eventoRisco: faltaRecente,
    pendenciaAjuste,
  };

  return { entradaReuniao, sugestaoSemaforo: semaforoDeReuniao(entradaReuniao) };
}
