import { describe, expect, it } from "vitest";

import { calcularAshworth, somaGlasgow } from "@/server/clinical/escalas";

describe("calcularAshworth", () => {
  it("sem nenhum grupo preenchido: total 0, média null", () => {
    const score = calcularAshworth({});
    expect(score).toEqual({ porGrupo: {}, gruposAvaliados: 0, total: 0, media: null });
  });

  it("ignora grupos null/undefined", () => {
    const score = calcularAshworth({
      cotoveloFlexores: null,
      cotoveloExtensores: undefined,
      punhoFlexores: 2,
    });
    expect(score.gruposAvaliados).toBe(1);
    expect(score.porGrupo).toEqual({ punhoFlexores: 2 });
  });

  it("soma e média de múltiplos grupos, incluindo valor 0 (não confundido com ausente)", () => {
    const score = calcularAshworth({
      cotoveloFlexores: 0,
      punhoFlexores: 4,
    });
    expect(score.gruposAvaliados).toBe(2);
    expect(score.total).toBe(4);
    expect(score.media).toBe(2);
    expect(score.porGrupo).toEqual({ cotoveloFlexores: 0, punhoFlexores: 4 });
  });

  it("todos os grupos preenchidos no máximo (4)", () => {
    const score = calcularAshworth({
      cotoveloFlexores: 4,
      cotoveloExtensores: 4,
      punhoFlexores: 4,
      joelhoFlexores: 4,
      joelhoExtensores: 4,
      tornozeloFlexoresPlantares: 4,
    });
    expect(score.gruposAvaliados).toBe(6);
    expect(score.total).toBe(24);
    expect(score.media).toBe(4);
  });
});

describe("somaGlasgow", () => {
  it("nenhum campo preenchido: incompleto, total null", () => {
    expect(somaGlasgow({})).toEqual({
      ocular: null,
      verbal: null,
      motor: null,
      total: null,
      completo: false,
    });
  });

  it("preenchimento parcial permanece incompleto", () => {
    const score = somaGlasgow({ ocular: 4, verbal: 5 });
    expect(score.completo).toBe(false);
    expect(score.total).toBeNull();
  });

  it("mínimo da escala (3): ocular 1 + verbal 1 + motor 1", () => {
    const score = somaGlasgow({ ocular: 1, verbal: 1, motor: 1 });
    expect(score).toEqual({ ocular: 1, verbal: 1, motor: 1, total: 3, completo: true });
  });

  it("máximo da escala (15): ocular 4 + verbal 5 + motor 6", () => {
    const score = somaGlasgow({ ocular: 4, verbal: 5, motor: 6 });
    expect(score.total).toBe(15);
    expect(score.completo).toBe(true);
  });

  it("trata null explícito como não preenchido", () => {
    const score = somaGlasgow({ ocular: 4, verbal: null, motor: 6 });
    expect(score.completo).toBe(false);
    expect(score.total).toBeNull();
  });
});
