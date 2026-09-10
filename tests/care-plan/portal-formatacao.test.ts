import { describe, expect, it } from "vitest";

import {
  LABEL_STATUS_META_ACESSIVEL,
  montarPercurso,
} from "@/server/care-plan/portal-formatacao";

describe("montarPercurso", () => {
  it("EM_AVALIACAO: primeira etapa atual, resto a fazer", () => {
    const etapas = montarPercurso("EM_AVALIACAO");
    expect(etapas.map((e) => e.situacao)).toEqual([
      "atual",
      "a_fazer",
      "a_fazer",
      "a_fazer",
      "a_fazer",
    ]);
  });

  it("SEGUIMENTO: etapas anteriores concluídas, dela em diante a fazer", () => {
    const etapas = montarPercurso("SEGUIMENTO");
    expect(etapas.map((e) => [e.chave, e.situacao])).toEqual([
      ["EM_AVALIACAO", "concluida"],
      ["PACTACAO", "concluida"],
      ["SEGUIMENTO", "atual"],
      ["REAVALIACAO", "a_fazer"],
      ["FECHADO", "a_fazer"],
    ]);
  });

  it("FECHADO: todas as etapas anteriores concluídas, última é a atual", () => {
    const etapas = montarPercurso("FECHADO");
    expect(etapas.every((e, i) => (i < 4 ? e.situacao === "concluida" : e.situacao === "atual"))).toBe(
      true,
    );
  });

  it("todas as etapas têm um label em linguagem acessível não vazio", () => {
    for (const etapa of montarPercurso("PACTACAO")) {
      expect(etapa.label.length).toBeGreaterThan(0);
    }
  });
});

describe("LABEL_STATUS_META_ACESSIVEL", () => {
  it("cobre os 4 status possíveis de meta com texto não técnico", () => {
    expect(Object.keys(LABEL_STATUS_META_ACESSIVEL).sort()).toEqual(
      ["CONCLUIDA", "EM_ANDAMENTO", "NAO_ALCANCADA", "NOVA"].sort(),
    );
    for (const label of Object.values(LABEL_STATUS_META_ACESSIVEL)) {
      expect(label.length).toBeGreaterThan(0);
    }
  });
});
