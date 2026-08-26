// ponytail: heurística v1 do semáforo; upgrade = regras configuráveis por escopo em cer.escopos

export type BandeirasClinicas = {
  motivoAgudo: boolean;
  altaHospitalarRecente: boolean;
  posCirurgico: boolean;
};

export type EixoSocial = {
  cuidadorPresente: boolean;
  zaritScore: number;
  vulnerabilidades: number;
};

export type EntradaSemaforo = {
  bandeiras: BandeirasClinicas;
  /** 4 sliders 0–100, 100 = independência total */
  funcional: [number, number, number, number];
  social: EixoSocial;
};

export type Classificacao = "VERDE" | "AMARELO" | "VERMELHO";

// Regras nomeadas (v1 — validar com consultor clínico no piloto):
const LIMIAR_FUNCIONAL_VERMELHO = 40; // média < 40 → VERMELHO
const LIMIAR_FUNCIONAL_AMARELO = 70; // média < 70 → AMARELO
const LIMIAR_ZARIT = 12; // zarit >= 12 → gatilho social

type PontuacaoJson = {
  bandeiras: BandeirasClinicas;
  mediaFuncional: number;
  social: EixoSocial;
  pontosSociais: number;
  /** regra que decidiu a classificação final */
  regraDisparo: "bandeira_clinica" | "eixo_funcional" | "eixo_social" | "nenhuma";
};

function elevar(c: Classificacao): Classificacao {
  return c === "VERDE" ? "AMARELO" : "VERMELHO";
}

/**
 * Semáforo do cuidado (função pura, determinística).
 * 1. Qualquer bandeira clínica → VERMELHO direto.
 * 2. Média funcional < 40 → VERMELHO; < 70 → AMARELO.
 * 3. Social: cuidador ausente ou Zarit >= LIMIAR_ZARIT eleva 1 nível.
 *    Cada vulnerabilidade soma ponto ao score social.
 */
export function calcularSemaforo(e: EntradaSemaforo): {
  classificacao: Classificacao;
  pontuacaoJson: object;
} {
  const mediaFuncional =
    e.funcional.reduce((s, v) => s + v, 0) / e.funcional.length;
  const pontosSociais = e.social.vulnerabilidades;

  let classificacao: Classificacao;
  let regraDisparo: PontuacaoJson["regraDisparo"];

  if (
    e.bandeiras.motivoAgudo ||
    e.bandeiras.altaHospitalarRecente ||
    e.bandeiras.posCirurgico
  ) {
    classificacao = "VERMELHO";
    regraDisparo = "bandeira_clinica";
  } else if (mediaFuncional < LIMIAR_FUNCIONAL_VERMELHO) {
    classificacao = "VERMELHO";
    regraDisparo = "eixo_funcional";
  } else if (mediaFuncional < LIMIAR_FUNCIONAL_AMARELO) {
    classificacao = "AMARELO";
    regraDisparo = "eixo_funcional";
  } else {
    classificacao = "VERDE";
    regraDisparo = "nenhuma";
  }

  const gatilhoSocial =
    !e.social.cuidadorPresente || e.social.zaritScore >= LIMIAR_ZARIT;
  if (gatilhoSocial) {
    const antes = classificacao;
    classificacao = elevar(classificacao);
    // social só é a regra decisiva quando realmente eleva o nível
    if (classificacao !== antes) regraDisparo = "eixo_social";
  }

  const pontuacaoJson: PontuacaoJson = {
    bandeiras: e.bandeiras,
    mediaFuncional,
    social: e.social,
    pontosSociais,
    regraDisparo,
  };

  return { classificacao, pontuacaoJson };
}
