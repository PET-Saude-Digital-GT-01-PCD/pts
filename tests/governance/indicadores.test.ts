import { describe, expect, it } from "vitest";

import {
  classificarIndicador,
  paraCsv,
  type IndicadorGovernanca,
} from "@/server/governance/indicadores";

describe("classificarIndicador", () => {
  it("valor null: SEM_DADO independente da direção", () => {
    expect(classificarIndicador(null, 70, true)).toBe("SEM_DADO");
    expect(classificarIndicador(null, 24, false)).toBe("SEM_DADO");
  });

  it("maiorEhMelhor=true: valor acima da meta é OK", () => {
    expect(classificarIndicador(80, 70, true)).toBe("OK");
  });

  it("maiorEhMelhor=true: valor exatamente na meta é OK (limite inclusivo)", () => {
    expect(classificarIndicador(70, 70, true)).toBe("OK");
  });

  it("maiorEhMelhor=true: valor abaixo da meta é ATENCAO", () => {
    expect(classificarIndicador(69, 70, true)).toBe("ATENCAO");
  });

  it("maiorEhMelhor=false: valor abaixo da meta é OK", () => {
    expect(classificarIndicador(10, 24, false)).toBe("OK");
  });

  it("maiorEhMelhor=false: valor exatamente na meta é OK (limite inclusivo)", () => {
    expect(classificarIndicador(24, 24, false)).toBe("OK");
  });

  it("maiorEhMelhor=false: valor acima da meta é ATENCAO", () => {
    expect(classificarIndicador(25, 24, false)).toBe("ATENCAO");
  });

  it("valor 0 não é confundido com null/ausente", () => {
    expect(classificarIndicador(0, 70, true)).toBe("ATENCAO");
    expect(classificarIndicador(0, 0, false)).toBe("OK");
  });
});

const INDICADOR_BASE: IndicadorGovernanca = {
  id: "adesao",
  titulo: "Adesão",
  valor: 75,
  unidade: "%",
  meta: 70,
  maiorEhMelhor: true,
  fonte: "evento_cuidado",
  disponivel: true,
};

describe("paraCsv", () => {
  it("lista vazia: só o cabeçalho", () => {
    expect(paraCsv([])).toBe("indicador,valor,unidade,meta,status,fonte");
  });

  it("uma linha com status calculado a partir do valor/meta", () => {
    const csv = paraCsv([INDICADOR_BASE]);
    const linhas = csv.split("\n");
    expect(linhas[0]).toBe("indicador,valor,unidade,meta,status,fonte");
    expect(linhas[1]).toBe("Adesão,75,%,70,OK,evento_cuidado");
  });

  it("indicador indisponível: status SEM_DADO mesmo com valor numérico presente", () => {
    const csv = paraCsv([{ ...INDICADOR_BASE, disponivel: false }]);
    expect(csv.split("\n")[1]).toContain(",SEM_DADO,");
  });

  it("valor null: campo de valor fica vazio no CSV", () => {
    const csv = paraCsv([{ ...INDICADOR_BASE, valor: null, disponivel: false }]);
    expect(csv.split("\n")[1]).toBe("Adesão,,%,70,SEM_DADO,evento_cuidado");
  });

  it("escapa vírgula e aspas no título/fonte", () => {
    const csv = paraCsv([
      { ...INDICADOR_BASE, titulo: 'Meta, "especial"', fonte: "tabela, campo" },
    ]);
    const linha = csv.split("\n")[1];
    expect(linha).toContain('"Meta, ""especial"""');
    expect(linha).toContain('"tabela, campo"');
  });
});
