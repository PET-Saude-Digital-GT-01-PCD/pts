// ponytail: escala numérica genérica 0–100 v1 (0 = pior, 100 = melhor);
// upgrade = escalas ordinais por item validadas com consultor clínico no piloto.

export type EntradaRelato = {
  mobilidadeRelatada?: number | null;
  expectativaRecuperacao?: number | null;
  autonomiaRelatada?: number | null;
};

export type EntradaAvaliacao = {
  mobilidadeMedida?: number | null;
  prognosticoClinico?: number | null;
  autonomiaObservada?: number | null;
};

export type GrauDivergencia = "ALTA" | "MEDIA" | "BAIXA" | "NENHUMA";

export type Divergencia = {
  item: string;
  grau: GrauDivergencia;
  relato: number;
  avaliacao: number;
};

// Itens mapeados fixos (v1): par [chave relato, chave avaliação, rótulo].
const ITENS_MAPEADOS: [keyof EntradaRelato, keyof EntradaAvaliacao, string][] = [
  ["mobilidadeRelatada", "mobilidadeMedida", "mobilidadeRelatada_vs_mobilidadeMedida"],
  ["expectativaRecuperacao", "prognosticoClinico", "expectativaRecuperacao_vs_prognosticoClinico"],
  ["autonomiaRelatada", "autonomiaObservada", "autonomiaRelatada_vs_autonomiaObservada"],
];

// Limiares de |relato − avaliação| (0–100):
const LIMIAR_ALTA = 50; // contradição de extremos
const LIMIAR_MEDIA = 25;

function valido(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100;
}

/**
 * Divergência saudável (função pura, determinística, direcional — nunca bloqueante).
 * Item sem dado em qualquer lado → ignorado (não inventa dado).
 */
export function calcularDivergencia(
  relato: EntradaRelato,
  avaliacao: EntradaAvaliacao,
): Divergencia[] {
  const resultado: Divergencia[] = [];

  for (const [chaveRelato, chaveAvaliacao, item] of ITENS_MAPEADOS) {
    const valorRelato = relato[chaveRelato];
    const valorAvaliacao = avaliacao[chaveAvaliacao];
    if (!valido(valorRelato) || !valido(valorAvaliacao)) continue;

    const diff = Math.abs(valorRelato - valorAvaliacao);
    let grau: GrauDivergencia;
    if (diff === 0) grau = "NENHUMA";
    else if (diff >= LIMIAR_ALTA) grau = "ALTA";
    else if (diff >= LIMIAR_MEDIA) grau = "MEDIA";
    else grau = "BAIXA";

    resultado.push({ item, grau, relato: valorRelato, avaliacao: valorAvaliacao });
  }

  return resultado;
}
