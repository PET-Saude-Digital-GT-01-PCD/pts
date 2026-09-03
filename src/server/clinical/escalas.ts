// Funções puras de score para as escalas clínicas do bloco Objetivo (SOAP).
// Sem "use server": usadas tanto no server action (soap.ts) quanto no client (soap-form.tsx).

export const GRUPOS_ASHWORTH = [
  "cotoveloFlexores",
  "cotoveloExtensores",
  "punhoFlexores",
  "joelhoFlexores",
  "joelhoExtensores",
  "tornozeloFlexoresPlantares",
] as const;

export type GrupoAshworth = (typeof GRUPOS_ASHWORTH)[number];

export type ValoresAshworth = Partial<Record<GrupoAshworth, number | null | undefined>>;

export type ScoreAshworth = {
  porGrupo: Partial<Record<GrupoAshworth, number>>;
  gruposAvaliados: number;
  total: number;
  media: number | null;
};

/** Escala de Ashworth Modificada (0–4) por grupo muscular; soma e média dos grupos preenchidos. */
export function calcularAshworth(valores: ValoresAshworth): ScoreAshworth {
  const porGrupo: Partial<Record<GrupoAshworth, number>> = {};
  let total = 0;
  let gruposAvaliados = 0;

  for (const grupo of GRUPOS_ASHWORTH) {
    const v = valores[grupo];
    if (v === null || v === undefined) continue;
    porGrupo[grupo] = v;
    total += v;
    gruposAvaliados += 1;
  }

  return {
    porGrupo,
    gruposAvaliados,
    total,
    media: gruposAvaliados === 0 ? null : total / gruposAvaliados,
  };
}

export type ValoresGlasgow = {
  ocular?: number | null;
  verbal?: number | null;
  motor?: number | null;
};

export type ScoreGlasgow = {
  ocular: number | null;
  verbal: number | null;
  motor: number | null;
  total: number | null;
  completo: boolean;
};

/** Escala de Coma de Glasgow: ocular (1–4) + verbal (1–5) + motor (1–6) → total 3–15. */
export function somaGlasgow(valores: ValoresGlasgow): ScoreGlasgow {
  const ocular = valores.ocular ?? null;
  const verbal = valores.verbal ?? null;
  const motor = valores.motor ?? null;
  const completo = ocular !== null && verbal !== null && motor !== null;

  return {
    ocular,
    verbal,
    motor,
    total: completo ? ocular + verbal + motor : null,
    completo,
  };
}
