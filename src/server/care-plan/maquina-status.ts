import type { StatusPts } from "@prisma/client";

// Máquina de estados do PTS (CONTEXT.md):
// EM_AVALIACAO → PACTACAO → SEGUIMENTO → REAVALIACAO → EM_AVALIACAO | FECHADO
export const TRANSICOES_VALIDAS: Record<StatusPts, readonly StatusPts[]> = {
  EM_AVALIACAO: ["PACTACAO"],
  PACTACAO: ["SEGUIMENTO"],
  SEGUIMENTO: ["REAVALIACAO"],
  REAVALIACAO: ["EM_AVALIACAO", "FECHADO"],
  FECHADO: [],
};

export function transicoesValidas(de: StatusPts): readonly StatusPts[] {
  return TRANSICOES_VALIDAS[de];
}

export function podeTransicionar(de: StatusPts, para: StatusPts): boolean {
  return TRANSICOES_VALIDAS[de].includes(para);
}

export function mensagemTransicaoInvalida(
  de: StatusPts,
  para: StatusPts,
): string {
  const validas = TRANSICOES_VALIDAS[de];
  if (validas.length === 0) {
    return `PTS já está FECHADO (terminal); nenhuma transição é possível.`;
  }
  const lista = validas.join(", ");
  return `Transição inválida de ${de} para ${para}. Transições válidas a partir de ${de}: ${lista}.`;
}
