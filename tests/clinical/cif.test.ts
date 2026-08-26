import { describe, expect, it } from "vitest";

import { marcarCif } from "@/server/clinical/cif";

describe("marcarCif", () => {
  it("item FISIO marcado gera seus códigos", () => {
    expect(marcarCif("FISIO", { mobilidade: true })).toEqual([
      "d410",
      "d450",
      "d455",
    ]);
  });

  it("força FISIO → b730", () => {
    expect(marcarCif("FISIO", { forca: true })).toEqual(["b730"]);
  });

  it("fatores ambientais FISIO → e310, e355", () => {
    expect(marcarCif("FISIO", { fatoresAmbientais: true })).toEqual([
      "e310",
      "e355",
    ]);
  });

  it("objetivos funcionais FISIO não gera código", () => {
    expect(marcarCif("FISIO", { objetivosFuncionais: true })).toEqual([]);
  });

  it("itens TO geram seus códigos AVD + órteses", () => {
    expect(marcarCif("TO", { alimentacao: true })).toEqual(["d550"]);
    expect(marcarCif("TO", { higiene: true })).toEqual(["d510"]);
    expect(marcarCif("TO", { vestuario: true })).toEqual(["d540"]);
    expect(marcarCif("TO", { ortesesAdaptacoes: true })).toEqual(["e120"]);
  });

  it("múltiplos itens concatenam em ordem estável", () => {
    const codigos = marcarCif("FISIO", {
      forca: true,
      mobilidade: true,
      fatoresAmbientais: true,
    });
    expect(codigos).toEqual(["d410", "d450", "d455", "b730", "e310", "e355"]);
  });

  it("ordem de inserção não altera o resultado (estável)", () => {
    const a = marcarCif("TO", { vestuario: true, alimentacao: true });
    const b = marcarCif("TO", { alimentacao: true, vestuario: true });
    expect(a).toEqual(b);
    expect(a).toEqual(["d550", "d540"]);
  });

  it("códigos duplicados entre itens aparecem uma única vez (dedupe)", () => {
    // mapa mínimo atual não tem sobreposição, mas dedupe é contrato da função
    const codigos = marcarCif("FISIO", {
      mobilidade: true,
      forca: true,
    });
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it("item desconhecido é ignorado", () => {
    expect(
      marcarCif("FISIO", { itemInexistente: true, forca: true } as Record<
        string,
        boolean
      >),
    ).toEqual(["b730"]);
  });

  it("nada marcado → array vazio", () => {
    expect(marcarCif("FISIO", {})).toEqual([]);
    expect(marcarCif("TO", {})).toEqual([]);
  });

  it("valores falsy não marcam", () => {
    expect(
      marcarCif("TO", { alimentacao: false, higiene: false }),
    ).toEqual([]);
  });

  it("especialidade sem mapa conhecido → vazio", () => {
    expect(
      marcarCif("PSICO" as never, { qualquerCoisa: true }),
    ).toEqual([]);
  });
});
