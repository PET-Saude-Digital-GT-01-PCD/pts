import { describe, expect, it } from "vitest";

import {
  diasAteRegularizacao,
  ppiPactuadaAgora,
  type PpiLocalResumo,
} from "@/server/reception/ppi";

const AGORA = new Date("2026-09-03T12:00:00Z");

describe("reception/ppi — ppiPactuadaAgora", () => {
  it("sem registro de PPI → não pactuada", () => {
    expect(ppiPactuadaAgora(null, AGORA)).toBe(false);
  });

  it("pactuado=false → não pactuada", () => {
    const ppi: PpiLocalResumo = { pactuado: false, vigenciaAte: null };
    expect(ppiPactuadaAgora(ppi, AGORA)).toBe(false);
  });

  it("pactuado=true sem vigência → pactuada", () => {
    const ppi: PpiLocalResumo = { pactuado: true, vigenciaAte: null };
    expect(ppiPactuadaAgora(ppi, AGORA)).toBe(true);
  });

  it("pactuado=true com vigência futura → pactuada", () => {
    const ppi: PpiLocalResumo = {
      pactuado: true,
      vigenciaAte: new Date("2027-01-01"),
    };
    expect(ppiPactuadaAgora(ppi, AGORA)).toBe(true);
  });

  it("pactuado=true com vigência já vencida → não pactuada", () => {
    const ppi: PpiLocalResumo = {
      pactuado: true,
      vigenciaAte: new Date("2026-01-01"),
    };
    expect(ppiPactuadaAgora(ppi, AGORA)).toBe(false);
  });

  it("limite: vigência exatamente agora ainda é válida (vigente até é inclusivo)", () => {
    const ppi: PpiLocalResumo = { pactuado: true, vigenciaAte: AGORA };
    expect(ppiPactuadaAgora(ppi, AGORA)).toBe(true);
  });

  it("limite: 1ms após a vigência já é vencida", () => {
    const ppi: PpiLocalResumo = {
      pactuado: true,
      vigenciaAte: new Date(AGORA.getTime() - 1),
    };
    expect(ppiPactuadaAgora(ppi, AGORA)).toBe(false);
  });

  it("determinístico: mesmo input → mesma saída", () => {
    const ppi: PpiLocalResumo = { pactuado: true, vigenciaAte: null };
    expect(ppiPactuadaAgora(ppi, AGORA)).toBe(ppiPactuadaAgora(ppi, AGORA));
  });
});

describe("reception/ppi — diasAteRegularizacao", () => {
  it("prazo no futuro retorna dias positivos", () => {
    const prazo = new Date(AGORA.getTime() + 5 * 24 * 60 * 60 * 1000);
    expect(diasAteRegularizacao(prazo, AGORA)).toBe(5);
  });

  it("prazo no passado retorna dias negativos", () => {
    const prazo = new Date(AGORA.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(diasAteRegularizacao(prazo, AGORA)).toBe(-3);
  });

  it("prazo igual a agora retorna 0", () => {
    expect(diasAteRegularizacao(AGORA, AGORA)).toBe(0);
  });
});
