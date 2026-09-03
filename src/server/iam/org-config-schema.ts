import { z } from "zod";

// Branding por organização (#68, ADR-0010): nome/logo/parceiros configuráveis
// pelo admin, só por URL (sem upload — requer storage, fora de escopo).
// Sem "use server": resolverOrgConfig é usada tanto no layout raiz (leitura
// pública, sem sessão) quanto na tela de edição.

export const NOME_ORG_PADRAO = "PTS Digital";

export type Parceiro = { nome: string; logoUrl: string };

export type OrgConfigView = {
  nomeExibido: string;
  logoUrl: string | null;
  parceiros: Parceiro[];
};

type OrgConfigRow = {
  nomeExibido: string | null;
  logoUrl: string | null;
  parceirosJson: unknown;
} | null;

function normalizarParceiros(json: unknown): Parceiro[] {
  if (!Array.isArray(json)) return [];
  const parceiros: Parceiro[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) continue;
    const { nome, logoUrl } = item as Record<string, unknown>;
    if (
      typeof nome === "string" &&
      nome.trim() !== "" &&
      typeof logoUrl === "string" &&
      logoUrl.trim() !== ""
    ) {
      parceiros.push({ nome: nome.trim(), logoUrl: logoUrl.trim() });
    }
  }
  return parceiros;
}

/** Aplica os defaults (nome "PTS Digital", sem logo, sem parceiros) quando a org não configurou algo. */
export function resolverOrgConfig(config: OrgConfigRow): OrgConfigView {
  if (!config) return { nomeExibido: NOME_ORG_PADRAO, logoUrl: null, parceiros: [] };
  return {
    nomeExibido: config.nomeExibido?.trim() || NOME_ORG_PADRAO,
    logoUrl: config.logoUrl?.trim() || null,
    parceiros: normalizarParceiros(config.parceirosJson),
  };
}

const urlOuVazia = z.union([z.string().trim().url("URL inválida."), z.literal("")]);

export const parceiroInputSchema = z.object({
  nome: z.string().trim().min(1, "Nome do parceiro obrigatório."),
  logoUrl: z.string().trim().url("URL do logo do parceiro inválida."),
});

export const orgConfigInputSchema = z.object({
  nomeExibido: z.string().trim().min(1, "Nome obrigatório.").max(120),
  logoUrl: urlOuVazia.optional(),
  parceiros: z.array(parceiroInputSchema).default([]),
});
