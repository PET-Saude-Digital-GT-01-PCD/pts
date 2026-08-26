import { describe, expect, it } from "vitest";

import {
  semaforoDeReuniao,
  type EntradaReuniao,
} from "@/server/care-plan/semaforo-reuniao";

const base: EntradaReuniao = {
  divergenciaEspecialidades: false,
  conflitosMeta: 0,
  eventoRisco: false,
  pendenciaAjuste: false,
};

describe("care-plan/semaforo-reuniao", () => {
  it("VERDE quando nada sinalizado", () => {
    expect(semaforoDeReuniao(base)).toBe("VERDE");
  });

  it("AMARELO quando só pendência de ajuste", () => {
    expect(semaforoDeReuniao({ ...base, pendenciaAjuste: true })).toBe(
      "AMARELO",
    );
  });

  it("VERMELHO com divergência entre especialidades", () => {
    expect(semaforoDeReuniao({ ...base, divergenciaEspecialidades: true })).toBe(
      "VERMELHO",
    );
  });

  it("VERMELHO com evento de risco", () => {
    expect(semaforoDeReuniao({ ...base, eventoRisco: true })).toBe("VERMELHO");
  });

  it("limite: conflitosMeta = 0 não pinta VERMELHO", () => {
    expect(semaforoDeReuniao(base)).toBe("VERDE");
  });

  it("limite: conflitosMeta = 1 → VERMELHO", () => {
    expect(semaforoDeReuniao({ ...base, conflitosMeta: 1 })).toBe("VERMELHO");
  });

  it("VERMELHO prevalece sobre AMARELO", () => {
    expect(
      semaforoDeReuniao({
        ...base,
        conflitosMeta: 1,
        pendenciaAjuste: true,
      }),
    ).toBe("VERMELHO");
  });

  it("determinístico: mesmo input → mesma saída", () => {
    const entrada = { ...base, pendenciaAjuste: true, eventoRisco: true };
    expect(semaforoDeReuniao(entrada)).toBe(semaforoDeReuniao(entrada));
  });
});
