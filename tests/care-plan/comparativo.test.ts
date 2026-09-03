import { describe, expect, it } from "vitest";

import { compararRevisoes, type TrilhasCaso } from "@/server/care-plan/comparativo";

const DIA_MS = 24 * 60 * 60 * 1000;
function data(diasDesdeEpoch: number): Date {
  return new Date(diasDesdeEpoch * DIA_MS);
}

const TRILHAS_VAZIAS: TrilhasCaso = {
  metas: [],
  avaliacoes: [],
  ajustesClassificacao: [],
  semaforoReuniao: [],
};

describe("compararRevisoes", () => {
  it("trilhas vazias: comparativo vazio", () => {
    const r = compararRevisoes(data(0), data(10), TRILHAS_VAZIAS);
    expect(r).toEqual({
      desde: data(0),
      ate: data(10),
      metas: [],
      avaliacoes: [],
      ajustesClassificacao: [],
      semaforoReuniao: [],
    });
  });

  it("evento antes do marco inicial (desde): excluído", () => {
    const r = compararRevisoes(data(5), data(10), {
      ...TRILHAS_VAZIAS,
      avaliacoes: [{ id: "a1", especialidade: "FISIO", criadaEm: data(3) }],
    });
    expect(r.avaliacoes).toEqual([]);
  });

  it("evento exatamente no marco inicial (desde): excluído — desde é exclusivo", () => {
    const r = compararRevisoes(data(5), data(10), {
      ...TRILHAS_VAZIAS,
      avaliacoes: [{ id: "a1", especialidade: "FISIO", criadaEm: data(5) }],
    });
    expect(r.avaliacoes).toEqual([]);
  });

  it("evento exatamente no marco final (ate): incluído — ate é inclusivo", () => {
    const r = compararRevisoes(data(5), data(10), {
      ...TRILHAS_VAZIAS,
      avaliacoes: [{ id: "a1", especialidade: "FISIO", criadaEm: data(10) }],
    });
    expect(r.avaliacoes).toHaveLength(1);
  });

  it("evento depois do marco final: excluído", () => {
    const r = compararRevisoes(data(5), data(10), {
      ...TRILHAS_VAZIAS,
      avaliacoes: [{ id: "a1", especialidade: "FISIO", criadaEm: data(15) }],
    });
    expect(r.avaliacoes).toEqual([]);
  });

  it("filtra as 4 trilhas de forma independente, mantendo só o que está na janela", () => {
    const trilhas: TrilhasCaso = {
      metas: [
        { metaId: "m1", descTecnica: "Meta 1", de: "NOVA", para: "EM_ANDAMENTO", data: data(6), motivo: null },
        { metaId: "m2", descTecnica: "Meta 2", de: null, para: "NOVA", data: data(2), motivo: null },
      ],
      avaliacoes: [
        { id: "a1", especialidade: "FISIO", criadaEm: data(7) },
        { id: "a2", especialidade: "TO", criadaEm: data(20) },
      ],
      ajustesClassificacao: [
        { id: "j1", de: "VERDE", para: "AMARELO", data: data(8), motivo: "piora" },
      ],
      semaforoReuniao: [
        { data: data(1), classificacao: "VERDE" },
        { data: data(9), classificacao: "AMARELO" },
      ],
    };
    const r = compararRevisoes(data(5), data(10), trilhas);
    expect(r.metas.map((m) => m.metaId)).toEqual(["m1"]);
    expect(r.avaliacoes.map((a) => a.id)).toEqual(["a1"]);
    expect(r.ajustesClassificacao.map((a) => a.id)).toEqual(["j1"]);
    expect(r.semaforoReuniao.map((s) => s.classificacao)).toEqual(["AMARELO"]);
  });

  it("é determinístico: mesma entrada produz sempre o mesmo comparativo", () => {
    const trilhas: TrilhasCaso = {
      ...TRILHAS_VAZIAS,
      avaliacoes: [{ id: "a1", especialidade: "FISIO", criadaEm: data(7) }],
    };
    const r1 = compararRevisoes(data(5), data(10), trilhas);
    const r2 = compararRevisoes(data(5), data(10), trilhas);
    expect(r1).toEqual(r2);
  });
});
