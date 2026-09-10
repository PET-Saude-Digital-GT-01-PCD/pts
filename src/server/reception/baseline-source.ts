/**
 * Porta canônica para busca de linha de base clínica do e-SUS (ADR-0008).
 * O contrato é por interface — o fluxo clínico nunca trava por indisponibilidade
 * da integração (ponytail: mock determinístico; upgrade = BaselineSourceEsus real).
 */

// ===== Tipos =====

export type OrigemCampo = "importado" | "digitado"

export interface DiagnosticoItem {
  cid10: string
  descricao: string
}

export interface MedicacaoItem {
  nome: string
  dose?: string
  via?: string
}

export interface InternacaoItem {
  motivo: string
  dataInicio?: string
  dataFim?: string
}

export interface AlergiasItem {
  agente: string
  reacao?: string
}

/** Dados clínicos trazidos do e-SUS ou digitados manualmente. */
export interface BaselineData {
  diagnosticos: DiagnosticoItem[]
  alergias: AlergiasItem[]
  medicacoes: MedicacaoItem[]
  internacoes: InternacaoItem[]
  origemJson: Record<keyof Omit<BaselineData, "origemJson">, OrigemCampo>
}

/** Resultado da busca — distingue dado encontrado, não encontrado e indisponibilidade. */
export type BaselineResult =
  | { status: "ok"; data: BaselineData }
  | { status: "nao_encontrado" }
  | { status: "indisponivel" }

// ===== Porta =====

/** Contrato da porta de integração e-SUS (ADR-0008). */
export interface BaselineSource {
  /**
   * Busca a linha de base clínica por CPF ou CNS.
   * Deve ser tolerante a falhas: não lança exceção em caso de indisponibilidade —
   * retorna `{ status: "indisponivel" }`.
   */
  getBaseline(cpfOuCns: string): Promise<BaselineResult>
}

// ===== Mock determinístico (ponytail: substituir por BaselineSourceEsus real em A5) =====

/** CPF normalizado para lookup: remove pontuação e espaços. */
function normalizarCpfCns(valor: string): string {
  return valor.replace(/\D/g, "")
}

/**
 * Base de dados do mock — determinística por CPF/CNS limpo.
 * Adicionar entradas aqui para cobrir casos de teste adicionais.
 */
const MOCK_DB: Record<string, BaselineData> = {
  // CPF "111.111.111-11" ou "11111111111"
  "11111111111": {
    diagnosticos: [
      { cid10: "G80.0", descricao: "Paralisia cerebral espástica" },
      { cid10: "F70", descricao: "Retardo mental leve" },
    ],
    alergias: [
      { agente: "Penicilina", reacao: "Anafilaxia" },
    ],
    medicacoes: [
      { nome: "Baclofeno", dose: "10mg", via: "oral" },
      { nome: "Ácido valpróico", dose: "500mg", via: "oral" },
    ],
    internacoes: [
      { motivo: "Pneumonia aspirativa", dataInicio: "2024-03-10", dataFim: "2024-03-18" },
    ],
    origemJson: {
      diagnosticos: "importado",
      alergias: "importado",
      medicacoes: "importado",
      internacoes: "importado",
    },
  },
  // CNS "900000000000001"
  "900000000000001": {
    diagnosticos: [{ cid10: "Q90", descricao: "Síndrome de Down" }],
    alergias: [],
    medicacoes: [{ nome: "Levotiroxina", dose: "50mcg", via: "oral" }],
    internacoes: [],
    origemJson: {
      diagnosticos: "importado",
      alergias: "importado",
      medicacoes: "importado",
      internacoes: "importado",
    },
  },
}

/** Mock BaselineSource — simula latência mínima de 200ms para representar IO. */
export const mockBaselineSource: BaselineSource = {
  async getBaseline(cpfOuCns: string): Promise<BaselineResult> {
    // Simula latência de rede
    await new Promise((resolve) => setTimeout(resolve, 200))

    const chave = normalizarCpfCns(cpfOuCns)
    const dado = MOCK_DB[chave]

    if (!dado) return { status: "nao_encontrado" }
    return { status: "ok", data: dado }
  },
}
