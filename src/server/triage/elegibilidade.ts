// ponytail: tabela estática v1 por escopo; upgrade = faixas configuráveis por organização (cer.escopos)

export type EscopoCER = "FISICA" | "INTELECTUAL" | "VISUAL" | "AUDITIVA";

export type ResultadoElegibilidade =
  | "ELEGIVEL"
  | "NAO_ELEGIVEL"
  | "REVISAO_MANUAL";

/** Faixa CID-10 inclusiva: letra + [min, max] numéricos de 2 dígitos */
type FaixaCid = { letra: string; min: number; max: number };

// Regras v1 — validar com consultor clínico no piloto.
const FAIXAS_POR_ESCOPO: Record<EscopoCER, FaixaCid[]> = {
  FISICA: [
    { letra: "G", min: 0, max: 99 },
    { letra: "M", min: 0, max: 99 },
    { letra: "S", min: 0, max: 99 },
    { letra: "T", min: 0, max: 98 }, // S00–T98
  ],
  INTELECTUAL: [{ letra: "F", min: 70, max: 89 }],
  VISUAL: [
    { letra: "H", min: 53, max: 54 },
  ],
  AUDITIVA: [{ letra: "H", min: 90, max: 91 }],
};

const JUSTIFICATIVA_NAO_ELEGIVEL =
  "CID mapeado para deficiência fora dos escopos atendidos por este CER.";

/** Parse CID-10: letra (any case) + 2 dígitos + opcional subcategoria. Retorna null se malformado. */
function parseCid(cid: string): { letra: string; numero: number } | null {
  const m = /^([A-Za-z])(\d{2})(\.\d{1,2})?$/.exec(cid.trim());
  if (!m) return null;
  return { letra: m[1].toUpperCase(), numero: Number(m[2]) };
}

export function elegibilidadePorEscopo(
  cid: string,
  motivo: string,
  escoposCER: EscopoCER[],
): { resultado: ResultadoElegibilidade; justificativa?: string } {
  void motivo; // v1 não filtra por motivo; reservado para regras futuras
  const parsed = parseCid(cid);
  if (!parsed) {
    return {
      resultado: "REVISAO_MANUAL",
      justificativa: `CID "${cid}" não reconhecido como CID-10 válido — revisão manual.`,
    };
  }

  const mapeadoEmAlgumEscopo = Object.values(FAIXAS_POR_ESCOPO).some((faixas) =>
    faixas.some(
      (f) => f.letra === parsed.letra && parsed.numero >= f.min && parsed.numero <= f.max,
    ),
  );
  if (!mapeadoEmAlgumEscopo) {
    return {
      resultado: "REVISAO_MANUAL",
      justificativa: `CID ${cid} fora da tabela v1 — revisão manual (nunca reprovação automática).`,
    };
  }

  const compativelComCER = escoposCER.some((escopo) =>
    FAIXAS_POR_ESCOPO[escopo].some(
      (f) => f.letra === parsed.letra && parsed.numero >= f.min && parsed.numero <= f.max,
    ),
  );

  if (!compativelComCER) {
    return { resultado: "NAO_ELEGIVEL", justificativa: JUSTIFICATIVA_NAO_ELEGIVEL };
  }

  return { resultado: "ELEGIVEL" };
}
