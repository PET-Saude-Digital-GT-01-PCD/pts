import type { BaselinePaciente } from "../canonical";

// Tradutor canônico ↔ JSON. JSON nativamente round-tripa; as funções existem
// como costura do adapter (mesma assinatura dos demais formatos) e validam a
// forma mínima no parse.

export function baselineParaJson(b: BaselinePaciente): string {
  return JSON.stringify(b);
}

export function jsonParaBaseline(json: string): BaselinePaciente {
  const bruto = JSON.parse(json) as Partial<BaselinePaciente>;
  if (
    typeof bruto.identificador !== "string" ||
    !Array.isArray(bruto.diagnosticos) ||
    !Array.isArray(bruto.alergias) ||
    !Array.isArray(bruto.medicacoes) ||
    !Array.isArray(bruto.internacoes)
  ) {
    throw new Error("JSON de baseline inválido");
  }
  return bruto as BaselinePaciente;
}
