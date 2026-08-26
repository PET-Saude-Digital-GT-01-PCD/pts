import { describe, expect, it } from "vitest";

import {
  avaliacaoSoapSchema,
} from "@/server/clinical/soap-schema";

const dadosValidos = {
  subjetivo: "Relata dor ao deambular.",
  objetivo: "Marcha claudicante, ADM de joelho reduzida.",
  avaliacao: "Disfunção musculoesquelética em progressão.",
  plano: {
    gradeServicos: [
      {
        servico: "Fisioterapia motora",
        frequencia: "2x/semana",
        duracao: "12 semanas",
        justificativa: "Ganho de amplitude e força.",
      },
    ],
  },
};

describe("clinical/soap — schema zod (validação antes de persistir)", () => {
  it("aceita payload completo com grade de serviços", () => {
    const r = avaliacaoSoapSchema.safeParse(dadosValidos);
    expect(r.success).toBe(true);
  });

  it("grade de serviços vazia é válida", () => {
    const r = avaliacaoSoapSchema.safeParse({
      ...dadosValidos,
      plano: { gradeServicos: [] },
    });
    expect(r.success).toBe(true);
  });

  it("rejeita campo SOAP vazio/ausente", () => {
    for (const campo of ["subjetivo", "objetivo", "avaliacao"] as const) {
      const semCampo = { ...dadosValidos };
      delete semCampo[campo];
      expect(avaliacaoSoapSchema.safeParse(semCampo).success).toBe(false);

      const vazio = { ...dadosValidos, [campo]: "   " };
      expect(avaliacaoSoapSchema.safeParse(vazio).success).toBe(false);
    }
  });

  it("rejeita item da grade sem atributo obrigatório", () => {
    for (const attr of ["servico", "frequencia", "duracao", "justificativa"] as const) {
      const item = {
        servico: "s",
        frequencia: "f",
        duracao: "d",
        justificativa: "j",
        [attr]: "",
      };
      const r = avaliacaoSoapSchema.safeParse({
        ...dadosValidos,
        plano: { gradeServicos: [item] },
      });
      expect(r.success).toBe(false);
    }
  });

  it("rejeita plano sem gradeServicos", () => {
    const r = avaliacaoSoapSchema.safeParse({
      subjetivo: "a",
      objetivo: "b",
      avaliacao: "c",
      plano: {},
    });
    expect(r.success).toBe(false);
  });

  it("trim remove espaços nas bordas", () => {
    const r = avaliacaoSoapSchema.parse({
      ...dadosValidos,
      subjetivo: "  texto com espaços  ",
    });
    expect(r.subjetivo).toBe("texto com espaços");
  });
});
