// Mapa checklist → CIF mínimo (RF-4.2). TDD: ver tests/clinical/cif.test.ts.
// ponytail: teto = mapa mínimo FISIO/TO; upgrade = catálogo completo da CIF
// quando as especialidades pós-MVP entrarem.

export type EspecialidadeCif = "FISIO" | "TO";

const MAPA_CIF: Record<EspecialidadeCif, Record<string, string[]>> = {
  FISIO: {
    mobilidade: ["d410", "d450", "d455"],
    forca: ["b730"],
    fatoresAmbientais: ["e310", "e355"],
    objetivosFuncionais: [],
  },
  TO: {
    alimentacao: ["d550"],
    higiene: ["d510"],
    vestuario: ["d540"],
    ortesesAdaptacoes: ["e120"],
  },
};

// RF-UX-3: cada profissional vê só o seu escopo. Demais categorias
// (admin/gestão) não recebem formulário FISIO/TO.
const MAPA_CATEGORIA_ESPECIALIDADE: Record<string, EspecialidadeCif> = {
  FISIOTERAPEUTA: "FISIO",
  TERAPEUTA_OCUPACIONAL: "TO",
};

export function especialidadesDoUsuario(
  categoria: string | null | undefined,
): EspecialidadeCif[] {
  const esp = categoria
    ? MAPA_CATEGORIA_ESPECIALIDADE[categoria]
    : undefined;
  return esp ? [esp] : [];
}

/** Ordem de saída = ordem fixa do mapa, não a ordem de inserção do checklist. */
function dedupe(codigos: string[]): string[] {
  return [...new Set(codigos)];
}

/**
 * Gera códigos CIF a partir do checklist marcado de uma avaliação.
 * Itens desconhecidos são ignorados; nada marcado devolve [].
 */
export function marcarCif(
  especialidade: EspecialidadeCif,
  checklist: Record<string, boolean>,
): string[] {
  const mapa = MAPA_CIF[especialidade];
  if (!mapa) return [];
  const codigos: string[] = [];
  for (const item of Object.keys(mapa)) {
    if (checklist[item] === true) {
      codigos.push(...mapa[item]);
    }
  }
  return dedupe(codigos);
}
