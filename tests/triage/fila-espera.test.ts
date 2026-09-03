import { describe, expect, it } from "vitest";

import {
  intervaloMedioAdmissoesMs,
  montarFilaAmarela,
  ordenarFilaAmarela,
  type EntradaFila,
} from "@/server/triage/fila-espera";

const DIA_MS = 24 * 60 * 60 * 1000;

function data(diasAtras: number): Date {
  return new Date(Date.now() - diasAtras * DIA_MS);
}

describe("ordenarFilaAmarela", () => {
  it("ordena por antiguidade da triagem (mais antiga primeiro)", () => {
    const entradas: EntradaFila[] = [
      { ptsId: "b", pacienteNome: "B", triagemEm: data(1) },
      { ptsId: "a", pacienteNome: "A", triagemEm: data(5) },
      { ptsId: "c", pacienteNome: "C", triagemEm: data(3) },
    ];
    const ordenada = ordenarFilaAmarela(entradas);
    expect(ordenada.map((e) => e.ptsId)).toEqual(["a", "c", "b"]);
  });

  it("não muta o array original", () => {
    const entradas: EntradaFila[] = [
      { ptsId: "a", pacienteNome: "A", triagemEm: data(1) },
      { ptsId: "b", pacienteNome: "B", triagemEm: data(2) },
    ];
    const copia = [...entradas];
    ordenarFilaAmarela(entradas);
    expect(entradas).toEqual(copia);
  });

  it("lista vazia retorna lista vazia", () => {
    expect(ordenarFilaAmarela([])).toEqual([]);
  });
});

describe("intervaloMedioAdmissoesMs", () => {
  it("menos de 2 datas: usa o padrão de 1 dia", () => {
    expect(intervaloMedioAdmissoesMs([])).toBe(DIA_MS);
    expect(intervaloMedioAdmissoesMs([data(1)])).toBe(DIA_MS);
  });

  it("calcula a média dos intervalos entre datas ordenadas", () => {
    // gaps de 2 dias e 4 dias → média 3 dias
    const datas = [data(6), data(4), data(0)];
    expect(intervaloMedioAdmissoesMs(datas)).toBe(3 * DIA_MS);
  });

  it("é independente da ordem de entrada (ordena internamente)", () => {
    const emOrdem = [data(6), data(4), data(0)];
    const foraDeOrdem = [data(0), data(6), data(4)];
    expect(intervaloMedioAdmissoesMs(foraDeOrdem)).toBe(
      intervaloMedioAdmissoesMs(emOrdem),
    );
  });

  it("datas simultâneas (gap 0) caem no padrão em vez de dividir por zero/estimar zero", () => {
    const agora = new Date();
    expect(intervaloMedioAdmissoesMs([agora, new Date(agora)])).toBe(DIA_MS);
  });
});

describe("montarFilaAmarela", () => {
  it("atribui posição 1-based na ordem de antiguidade", () => {
    const entradas: EntradaFila[] = [
      { ptsId: "b", pacienteNome: "B", triagemEm: data(1) },
      { ptsId: "a", pacienteNome: "A", triagemEm: data(5) },
    ];
    const fila = montarFilaAmarela(entradas, DIA_MS);
    expect(fila.map((f) => [f.ptsId, f.posicao])).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("estimativa = posição × intervalo médio, em dias", () => {
    const entradas: EntradaFila[] = [
      { ptsId: "a", pacienteNome: "A", triagemEm: data(5) },
      { ptsId: "b", pacienteNome: "B", triagemEm: data(1) },
    ];
    const fila = montarFilaAmarela(entradas, 2 * DIA_MS);
    expect(fila[0].estimativaDias).toBe(2); // posição 1 × 2 dias
    expect(fila[1].estimativaDias).toBe(4); // posição 2 × 2 dias
  });

  it("mesmo estado de entrada produz sempre a mesma fila (determinístico)", () => {
    const entradas: EntradaFila[] = [
      { ptsId: "a", pacienteNome: "A", triagemEm: data(3) },
      { ptsId: "b", pacienteNome: "B", triagemEm: data(1) },
      { ptsId: "c", pacienteNome: "C", triagemEm: data(2) },
    ];
    const fila1 = montarFilaAmarela(entradas, 1.5 * DIA_MS);
    const fila2 = montarFilaAmarela(entradas, 1.5 * DIA_MS);
    expect(fila1).toEqual(fila2);
  });

  it("fila vazia retorna lista vazia", () => {
    expect(montarFilaAmarela([], DIA_MS)).toEqual([]);
  });
});
