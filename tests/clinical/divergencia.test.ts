import { describe, expect, it } from "vitest";

import {
  calcularDivergencia,
  type EntradaRelato,
  type EntradaAvaliacao,
} from "@/server/clinical/divergencia";

const relatoCheio: EntradaRelato = {
  mobilidadeRelatada: 80,
  expectativaRecuperacao: 90,
  autonomiaRelatada: 70,
};

const avaliacaoConcordante: EntradaAvaliacao = {
  mobilidadeMedida: 75,
  prognosticoClinico: 85,
  autonomiaObservada: 72,
};

describe("clinical/divergencia", () => {
  it("sem divergência relevante (diferenças pequenas) → BAIXA/NENHUMA", () => {
    const r = calcularDivergencia(relatoCheio, avaliacaoConcordante);
    const porItem = Object.fromEntries(r.map((d) => [d.item, d.grau]));
    expect(porItem["mobilidadeRelatada_vs_mobilidadeMedida"]).toBe("BAIXA");
    expect(porItem["expectativaRecuperacao_vs_prognosticoClinico"]).toBe("BAIXA");
    expect(porItem["autonomiaRelatada_vs_autonomiaObservada"]).toBe("BAIXA");
  });

  it("valores iguais → NENHUMA", () => {
    const r = calcularDivergencia(
      { mobilidadeRelatada: 50 },
      { mobilidadeMedida: 50 },
    );
    expect(r).toHaveLength(1);
    expect(r[0].grau).toBe("NENHUMA");
  });

  it("diferença média (25–49) → MEDIA", () => {
    const r = calcularDivergencia(
      { mobilidadeRelatada: 80 },
      { mobilidadeMedida: 40 }, // diff 40
    );
    expect(r[0].grau).toBe("MEDIA");
  });

  it("contradição (diff >= 50) → ALTA em todos os 3 itens mapeados", () => {
    const r = calcularDivergencia(
      { mobilidadeRelatada: 90, expectativaRecuperacao: 95, autonomiaRelatada: 85 },
      { mobilidadeMedida: 20, prognosticoClinico: 10, autonomiaObservada: 30 },
    );
    expect(r.map((d) => d.grau)).toEqual(["ALTA", "ALTA", "ALTA"]);
    r.forEach((d) => {
      expect(d.relato).toBeDefined();
      expect(d.avaliacao).toBeDefined();
    });
  });

  it("bordas exatas: diff 24 BAIXA, 25 MEDIA, 49 MEDIA, 50 ALTA", () => {
    const par = (a: number, b: number) =>
      calcularDivergencia({ mobilidadeRelatada: a }, { mobilidadeMedida: b })[0].grau;
    expect(par(74, 50)).toBe("BAIXA"); // 24
    expect(par(75, 50)).toBe("MEDIA"); // 25
    expect(par(99, 50)).toBe("MEDIA"); // 49
    expect(par(100, 50)).toBe("ALTA"); // 50
  });

  it("item sem dado em qualquer lado → ignorado (não inventa)", () => {
    expect(calcularDivergencia({}, {})).toEqual([]);
    expect(
      calcularDivergencia({ mobilidadeRelatada: 60 }, {}),
    ).toEqual([]);
    expect(
      calcularDivergencia({}, { mobilidadeMedida: 60 }),
    ).toEqual([]);
  });

  it("só avalia os 3 itens mapeados (v1)", () => {
    const r = calcularDivergencia(
      { ...relatoCheio },
      { ...avaliacaoConcordante },
    );
    expect(r).toHaveLength(3);
    expect(r.map((d) => d.item)).toEqual([
      "mobilidadeRelatada_vs_mobilidadeMedida",
      "expectativaRecuperacao_vs_prognosticoClinico",
      "autonomiaRelatada_vs_autonomiaObservada",
    ]);
  });

  it("fora de 0–100 é ignorado (entrada inválida não vira divergência)", () => {
    expect(
      calcularDivergencia({ mobilidadeRelatada: 150 }, { mobilidadeMedida: 10 }),
    ).toEqual([]);
  });

  it("determinismo: mesmo input → mesma saída", () => {
    const a = calcularDivergencia(relatoCheio, avaliacaoConcordante);
    const b = calcularDivergencia(
      structuredClone(relatoCheio),
      structuredClone(avaliacaoConcordante),
    );
    expect(a).toEqual(b);
  });
});
