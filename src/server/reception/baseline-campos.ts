// Helpers puros da linha de base (testáveis sem I/O).

export type OrigemCampo = "importado" | "digitado";

export type CamposBaseline = {
  diagnosticos: string[];
  alergias: string[];
  medicacoes: { nome: string; dosagem: string | null }[];
  internacoes: string[];
};

export type OrigensBaseline = {
  diagnosticos: OrigemCampo;
  alergias: OrigemCampo;
  medicacoes: OrigemCampo;
  internacoes: OrigemCampo;
};

export const ORIGENS_DIGITADAS: OrigensBaseline = {
  diagnosticos: "digitado",
  alergias: "digitado",
  medicacoes: "digitado",
  internacoes: "digitado",
};

const CHAVES = ["diagnosticos", "alergias", "medicacoes", "internacoes"] as const;

function igual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Mescla baseline importada sobre campos atuais:
 * - campo vazio → recebe valor importado (`importado`);
 * - campo preenchido à mão com conteúdo diferente → não sobrescrito;
 * - campo idêntico ao importado → permanece como está.
 */
export function mesclarComImportacao(
  atual: CamposBaseline,
  origensAtuais: OrigensBaseline,
  importada: Partial<CamposBaseline>,
): { campos: CamposBaseline; origens: OrigensBaseline } {
  let campos = { ...atual };
  let origens = { ...origensAtuais };
  for (const chave of CHAVES) {
    const veio = importada[chave];
    if (veio === undefined || veio.length === 0) continue;
    if (igual(campos[chave], veio)) continue;
    if (!igual(campos[chave], []) && origens[chave] === "digitado") continue;
    campos = { ...campos, [chave]: veio };
    origens = { ...origens, [chave]: "importado" };
  }
  return { campos, origens };
}

/** Marca como `digitado` todo campo `importado` cujo valor mudou na edição. */
export function reclassificarEdicoes(
  importada: CamposBaseline,
  origens: OrigensBaseline,
  atual: CamposBaseline,
): OrigensBaseline {
  const resultado = { ...origens };
  for (const chave of CHAVES) {
    if (
      origens[chave] === "importado" &&
      !igual(atual[chave], importada[chave])
    ) {
      resultado[chave] = "digitado";
    }
  }
  return resultado;
}
