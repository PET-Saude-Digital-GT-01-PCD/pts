import { describe, expect, it } from "vitest";

import {
  verificarConflitoMetas,
  type ConflitoMeta,
  type MetaParaConflito,
} from "@/server/care-plan/conflitos";

const DIA = 24 * 60 * 60 * 1000;

function meta(overrides: Partial<MetaParaConflito>): MetaParaConflito {
  return {
    id: "00000000-0000-4000-8000-00000000ff01",
    ptsId: "00000000-0000-4000-8000-00000000ee01",
    status: "EM_ANDAMENTO",
    dataPactuacao: new Date(0),
    prazo: new Date(30 * DIA),
    dominioFuncional: null,
    donoCategoria: "FISIOTERAPEUTA",
    ...overrides,
  };
}

describe("care-plan/conflitos — verificarConflitoMetas", () => {
  it("sem conflito quando janelas de prazo disjuntas", () => {
    const conflitos = verificarConflitoMetas([
      meta({ id: "a", prazo: new Date(10 * DIA) }),
      meta({
        id: "b",
        dataPactuacao: new Date(20 * DIA),
        prazo: new Date(40 * DIA),
      }),
    ]);
    expect(conflitos).toEqual([]);
  });

  it("conflito de PRAZO quando janelas se intersectam", () => {
    const conflitos = verificarConflitoMetas([
      meta({ id: "a", prazo: new Date(25 * DIA) }),
      meta({
        id: "b",
        dataPactuacao: new Date(20 * DIA),
        prazo: new Date(40 * DIA),
      }),
    ]);
    expect(conflitos).toHaveLength(1);
    expect(conflitos[0]?.tipo).toBe("PRAZO");
    expect(
      [conflitos[0]?.metaAId, conflitos[0]?.metaBId].sort(),
    ).toEqual(["a", "b"]);
  });

  it("limite: encostar janelas (fim = início) NÃO é conflito", () => {
    const conflitos = verificarConflitoMetas([
      meta({ id: "a", prazo: new Date(10 * DIA) }),
      meta({ id: "b", dataPactuacao: new Date(10 * DIA), prazo: new Date(20 * DIA) }),
    ]);
    expect(conflitos).toEqual([]);
  });

  it("metas concluídas/não alcançadas não geram conflito", () => {
    const conflitos = verificarConflitoMetas([
      meta({ id: "a", status: "CONCLUIDA", prazo: new Date(25 * DIA) }),
      meta({
        id: "b",
        dataPactuacao: new Date(20 * DIA),
        prazo: new Date(40 * DIA),
      }),
      meta({ id: "c", status: "NAO_ALCANCADA", prazo: new Date(25 * DIA) }),
    ]);
    expect(conflitos).toEqual([]);
  });

  it("conflito de FOCO: mesmo domínio funcional, especialidades diferentes", () => {
    const conflitos = verificarConflitoMetas([
      meta({ id: "a", dominioFuncional: "mobilidade" }),
      meta({
        id: "b",
        dataPactuacao: new Date(40 * DIA),
        prazo: new Date(60 * DIA),
        dominioFuncional: "mobilidade",
        donoCategoria: "PSICOLOGO",
      }),
    ]);
    expect(conflitos).toHaveLength(1);
    expect(conflitos[0]?.tipo).toBe("FOCO");
  });

  it("mesmo domínio + mesma especialidade NÃO é foco (mas prazo pode ser)", () => {
    const conflitos = verificarConflitoMetas([
      meta({ id: "a", dominioFuncional: "mobilidade" }),
      meta({ id: "b", dominioFuncional: "mobilidade" }),
    ]);
    expect(conflitos.map((c) => c.tipo)).toEqual(["PRAZO"]);
  });

  it("domínios diferentes ou nulos não geram foco", () => {
    const conflitos = verificarConflitoMetas([
      meta({
        id: "a",
        dataPactuacao: new Date(40 * DIA),
        prazo: new Date(60 * DIA),
        dominioFuncional: "mobilidade",
      }),
      meta({
        id: "b",
        dataPactuacao: new Date(70 * DIA),
        prazo: new Date(90 * DIA),
        dominioFuncional: "comunicacao",
        donoCategoria: "PSICOLOGO",
      }),
      meta({
        id: "c",
        dataPactuacao: new Date(100 * DIA),
        prazo: new Date(120 * DIA),
        dominioFuncional: null,
        donoCategoria: "MEDICO",
      }),
    ]);
    expect(conflitos).toEqual([]);
  });

  it("pode acumular PRAZO e FOCO no mesmo par", () => {
    const conflitos = verificarConflitoMetas([
      meta({ id: "a", dominioFuncional: "mobilidade" }),
      meta({ id: "b", dominioFuncional: "mobilidade", donoCategoria: "TERAPEUTA_OCUPACIONAL" }),
    ]);
    expect(conflitos.map((c) => c.tipo).sort()).toEqual(["FOCO", "PRAZO"]);
  });

  it("determinístico e sem pares duplicados (3 metas sobrepostas → 3 pares)", () => {
    const entrada = [
      meta({ id: "a", dominioFuncional: "mobilidade" }),
      meta({ id: "b", dominioFuncional: "mobilidade", donoCategoria: "TERAPEUTA_OCUPACIONAL" }),
      meta({
        id: "c",
        dominioFuncional: "mobilidade",
        donoCategoria: "PSICOLOGO",
      }),
    ];
    const chave = (cs: ConflitoMeta[]) =>
      cs
        .map((c) => `${c.tipo}-${[c.metaAId, c.metaBId].sort().join("+")}`)
        .sort();
    expect(chave(verificarConflitoMetas(entrada))).toEqual(
      chave(verificarConflitoMetas([...entrada].reverse())),
    );
    expect(verificarConflitoMetas(entrada)).toHaveLength(6); // 3 pares × (prazo+foco)
  });
});
