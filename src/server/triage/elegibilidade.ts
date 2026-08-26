import type { Elegibilidade, Escopo } from "@prisma/client";

export type ResultadoElegibilidade = {
  resultado: Elegibilidade;
  justificativa?: string;
};

type GrupoCid = {
  letra: string;
  numero: number;
};

const JUSTIFICATIVA_FORA_DO_ESCOPO =
  "O CID informado pertence a um escopo de reabilitação não oferecido por este CER.";

function extrairGrupoCid(cid: string): GrupoCid | null {
  const cidNormalizado = cid.trim().toUpperCase();
  const correspondencia = cidNormalizado.match(
    /^([A-Z])(\d{2})(?:\.?[A-Z0-9]{1,4})?$/,
  );

  if (!correspondencia) {
    return null;
  }

  return {
    letra: correspondencia[1],
    numero: Number(correspondencia[2]),
  };
}

function obterEscoposDoCid(cid: string): Escopo[] {
  const grupo = extrairGrupoCid(cid);

  if (!grupo) {
    return [];
  }

  const { letra, numero } = grupo;

  if (
    (["G", "M", "S"].includes(letra) && numero >= 0 && numero <= 99) ||
    (letra === "T" && numero >= 0 && numero <= 98)
  ) {
    return ["FISICA"];
  }

  if (letra === "F" && numero >= 70 && numero <= 89) {
    return ["INTELECTUAL"];
  }

  if (letra === "H" && numero >= 53 && numero <= 54) {
    return ["VISUAL"];
  }

  if (letra === "H" && numero >= 90 && numero <= 91) {
    return ["AUDITIVA"];
  }

  return [];
}

export function elegibilidadePorEscopo(
  cid: string,
  motivo: string,
  escoposCER: readonly Escopo[],
): ResultadoElegibilidade {
  // ponytail: motivo é uma categoria livre reservada para regras futuras;
  // a versão inicial usa somente o CID e os escopos declarados pelo CER.
  void motivo;

  const escoposDoCid = obterEscoposDoCid(cid);

  if (escoposDoCid.length === 0) {
    return { resultado: "REVISAO_MANUAL" };
  }

  const possuiEscopoCompativel = escoposDoCid.some((escopo) =>
    escoposCER.includes(escopo),
  );

  if (possuiEscopoCompativel) {
    return { resultado: "ELEGIVEL" };
  }

  return {
    resultado: "NAO_ELEGIVEL",
    justificativa: JUSTIFICATIVA_FORA_DO_ESCOPO,
  };
}
