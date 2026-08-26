import type { BaselinePaciente } from "../canonical";
import type { BaselineSource } from "../contract";

// Mock determinístico por CPF/CNS conhecidos (tabela fixa no código).
// Reutilizar estes identificadores no seed/e2e da recepção (issue #23).

export const IDENTIFICADORES_TESTE = {
  /** baseline completa */
  COMPLETO: "52998224725",
  /** baseline parcial (só diagnósticos e alergias) */
  PARCIAL: "11144477735",
} as const;

const BASELINE_COMPLETA: BaselinePaciente = {
  identificador: IDENTIFICADORES_TESTE.COMPLETO,
  diagnosticos: ["Paralisia cerebral quadriplégica", "Epilepsia"],
  alergias: ["Dipirona"],
  medicacoes: [
    { nome: "Carbamazepina", dosagem: "200mg 2x/dia" },
    { nome: "Baclofeno", dosagem: "10mg 3x/dia" },
  ],
  internacoes: ["2024 - Pneumonia aspirativa"],
};

const BASELINE_PARCIAL: BaselinePaciente = {
  identificador: IDENTIFICADORES_TESTE.PARCIAL,
  diagnosticos: ["Síndrome de Down"],
  alergias: [],
  medicacoes: [],
  internacoes: [],
};

export class MockBaselineSource implements BaselineSource {
  async getBaseline(identificador: string): Promise<BaselinePaciente | null> {
    const digitos = identificador.replace(/\D/g, "");
    if (digitos === IDENTIFICADORES_TESTE.COMPLETO) return BASELINE_COMPLETA;
    if (digitos === IDENTIFICADORES_TESTE.PARCIAL) return BASELINE_PARCIAL;
    return null;
  }
}
