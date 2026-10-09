import { describe, expect, it } from "vitest";

import {
  horariosSeSobrepoem,
  intervaloSemanaAgenda,
  somarDiasCivis,
} from "@/server/care-plan/agenda-utils";

describe("agenda: cálculos de calendário e conflito", () => {
  it("monta semana de segunda a segunda usando o horário civil do CER", () => {
    const semana = intervaloSemanaAgenda("2026-09-23"); // quarta-feira
    expect(semana.primeiroDia).toBe("2026-09-21");
    expect(semana.inicio.toISOString()).toBe("2026-09-21T03:00:00.000Z");
    expect(semana.fim.toISOString()).toBe("2026-09-28T03:00:00.000Z");
  });

  it("rejeita datas civis inválidas", () => {
    expect(() => intervaloSemanaAgenda("2026-02-30")).toThrow("Data da agenda inválida.");
    expect(() => intervaloSemanaAgenda("23/09/2026")).toThrow("Data da agenda inválida.");
  });

  it("soma dias sem depender do fuso horário do servidor", () => {
    expect(somarDiasCivis("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("considera conflito quando intervalos se cruzam, mas permite horários adjacentes", () => {
    const existente = {
      inicioEm: new Date("2026-09-23T13:00:00.000Z"),
      fimEm: new Date("2026-09-23T13:30:00.000Z"),
    };
    expect(
      horariosSeSobrepoem(
        new Date("2026-09-23T13:29:00.000Z"),
        new Date("2026-09-23T13:45:00.000Z"),
        existente,
      ),
    ).toBe(true);
    expect(
      horariosSeSobrepoem(
        new Date("2026-09-23T13:30:00.000Z"),
        new Date("2026-09-23T14:00:00.000Z"),
        existente,
      ),
    ).toBe(false);
  });
});
