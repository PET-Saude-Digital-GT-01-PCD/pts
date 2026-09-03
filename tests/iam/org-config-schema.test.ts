import { describe, expect, it } from "vitest";

import { resolverOrgConfig } from "@/server/iam/org-config-schema";

describe("resolverOrgConfig", () => {
  it("sem config (null): defaults completos", () => {
    expect(resolverOrgConfig(null)).toEqual({
      nomeExibido: "PTS Digital",
      logoUrl: null,
      parceiros: [],
    });
  });

  it("nomeExibido null: cai no padrão", () => {
    const r = resolverOrgConfig({ nomeExibido: null, logoUrl: null, parceirosJson: null });
    expect(r.nomeExibido).toBe("PTS Digital");
  });

  it("nomeExibido em branco (só espaços): cai no padrão", () => {
    const r = resolverOrgConfig({ nomeExibido: "   ", logoUrl: null, parceirosJson: null });
    expect(r.nomeExibido).toBe("PTS Digital");
  });

  it("nomeExibido customizado é trimado", () => {
    const r = resolverOrgConfig({
      nomeExibido: "  CER Recife  ",
      logoUrl: null,
      parceirosJson: null,
    });
    expect(r.nomeExibido).toBe("CER Recife");
  });

  it("logoUrl em branco vira null", () => {
    const r = resolverOrgConfig({ nomeExibido: null, logoUrl: "  ", parceirosJson: null });
    expect(r.logoUrl).toBeNull();
  });

  it("logoUrl customizado é trimado", () => {
    const r = resolverOrgConfig({
      nomeExibido: null,
      logoUrl: "  https://ex.org/logo.png  ",
      parceirosJson: null,
    });
    expect(r.logoUrl).toBe("https://ex.org/logo.png");
  });

  it("parceirosJson não-array (null, objeto, string): vira lista vazia", () => {
    expect(resolverOrgConfig({ nomeExibido: null, logoUrl: null, parceirosJson: null }).parceiros).toEqual([]);
    expect(
      resolverOrgConfig({ nomeExibido: null, logoUrl: null, parceirosJson: { nome: "x" } })
        .parceiros,
    ).toEqual([]);
    expect(
      resolverOrgConfig({ nomeExibido: null, logoUrl: null, parceirosJson: "texto" }).parceiros,
    ).toEqual([]);
  });

  it("parceirosJson array com entradas válidas: mantém trimadas", () => {
    const r = resolverOrgConfig({
      nomeExibido: null,
      logoUrl: null,
      parceirosJson: [
        { nome: " UFPB ", logoUrl: " https://ex.org/ufpb.png " },
        { nome: "FUNAD", logoUrl: "https://ex.org/funad.png" },
      ],
    });
    expect(r.parceiros).toEqual([
      { nome: "UFPB", logoUrl: "https://ex.org/ufpb.png" },
      { nome: "FUNAD", logoUrl: "https://ex.org/funad.png" },
    ]);
  });

  it("parceirosJson com entradas malformadas: filtra silenciosamente", () => {
    const r = resolverOrgConfig({
      nomeExibido: null,
      logoUrl: null,
      parceirosJson: [
        { nome: "", logoUrl: "https://ex.org/x.png" }, // nome vazio
        { nome: "Sem logo" }, // logoUrl ausente
        { nome: "Válido", logoUrl: "https://ex.org/ok.png" },
        null,
        "string solta",
        { nome: 42, logoUrl: "https://ex.org/y.png" }, // nome não é string
      ],
    });
    expect(r.parceiros).toEqual([{ nome: "Válido", logoUrl: "https://ex.org/ok.png" }]);
  });
});
