import type { BaselinePaciente } from "../canonical";
import type { BaselineSource } from "../contract";

// Mock determinístico por CPF/CNS conhecidos (tabela fixa no código).
// Reutilizar estes identificadores no seed/e2e da recepção (issue #23).

export const IDENTIFICADORES_TESTE = {
  /** baseline completa */
  COMPLETO: "52998224725",
  /** baseline parcial (só diagnósticos e alergias) */
  PARCIAL: "11144477735",
  /** baseline personalizada para testes locais */
  CUSTOM: "12345678909",
} as const;

// Basta adicionar novos objetos nesta lista para simular mais pacientes!
const MOCK_DATABASE: BaselinePaciente[] = [
  {
    identificador: "52998224725",
    nome: "Maria Exemplo da Silva",
    dtnasc: "1995-03-15",
    sexo: "FEMININO",
    endereco: "Rua das Flores, 123",
    diagnosticos: ["Paralisia cerebral quadriplégica", "Epilepsia"],
    alergias: ["Dipirona"],
    medicacoes: [
      { nome: "Carbamazepina", dosagem: "200mg 2x/dia" },
      { nome: "Baclofeno", dosagem: "10mg 3x/dia" },
    ],
    internacoes: ["2024 - Pneumonia aspirativa"],
  },
  {
    identificador: "11144477735",
    nome: "João Exemplo",
    dtnasc: "1988-07-22",
    sexo: "MASCULINO",
    diagnosticos: ["Síndrome de Down"],
    alergias: [],
    medicacoes: [],
    internacoes: [],
  },
  {
    identificador: "12345678909",
    nome: "Miguel Santos",
    dtnasc: "1970-01-01",
    sexo: "MASCULINO",
    endereco: "Rua das Oliveiras, 256",
    diagnosticos: ["Hipertensão"],
    alergias: ["Amendoim"],
    medicacoes: [{ nome: "Losartana", dosagem: "50mg" }],
    internacoes: [],
  }
];

export class MockBaselineSource implements BaselineSource {
  async getBaseline(identificador: string): Promise<BaselinePaciente | null> {
    const digitos = identificador.replace(/\D/g, "");
    const paciente = MOCK_DATABASE.find(p => p.identificador === digitos);
    return paciente || null;
  }
}
