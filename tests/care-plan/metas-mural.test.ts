import { describe, expect, it } from "vitest";

import {
  metaInputSchema,
  transicaoStatusValida,
} from "@/server/care-plan/meta-schema";
import { muralInputSchema } from "@/server/care-plan/mural-schema";

const inputOk = {
  ptsId: "00000000-0000-4000-8000-00000000bb01",
  donoId: "00000000-0000-4000-8000-000000000002",
  descTecnica: "Amplitude de ombro direito ≥ 120°",
  descAcessivel: "Levantar o braço direito acima da cabeça",
  criteriosJson: { especifico: "flexão", mensuravel: "goniometria" },
  prazo: new Date("2026-12-01"),
};

describe("care-plan/meta-schema criarMeta", () => {
  it("aceita entrada completa", () => {
    const r = metaInputSchema.safeParse(inputOk);
    expect(r.success).toBe(true);
  });

  it("exige dupla linguagem: descAcessivel obrigatória", () => {
    const sem = { ...inputOk, descAcessivel: undefined };
    expect(metaInputSchema.safeParse(sem).success).toBe(false);
  });

  it("rejeita descTecnica vazia", () => {
    expect(
      metaInputSchema.safeParse({ ...inputOk, descTecnica: "  " }).success,
    ).toBe(false);
  });

  it("criteriosJson deve ser objeto (SMART), não array/string", () => {
    expect(
      metaInputSchema.safeParse({ ...inputOk, criteriosJson: [] }).success,
    ).toBe(false);
    expect(
      metaInputSchema.safeParse({ ...inputOk, criteriosJson: "SMART" })
        .success,
    ).toBe(false);
  });

  it("avaliacaoId é opcional", () => {
    const r = metaInputSchema.safeParse(inputOk);
    expect(r.success && r.data.avaliacaoId).toBeUndefined();
  });
});

describe("care-plan/meta-schema transicaoStatusValida", () => {
  it("NOVA → EM_ANDAMENTO ok", () => {
    expect(transicaoStatusValida("NOVA", "EM_ANDAMENTO")).toBe(true);
  });

  it("EM_ANDAMENTO → CONCLUIDA / NAO_ALCANCADA ok", () => {
    expect(transicaoStatusValida("EM_ANDAMENTO", "CONCLUIDA")).toBe(true);
    expect(transicaoStatusValida("EM_ANDAMENTO", "NAO_ALCANCADA")).toBe(true);
  });

  it("CONCLUIDA/NAO_ALCANCADA são finais", () => {
    expect(transicaoStatusValida("CONCLUIDA", "EM_ANDAMENTO")).toBe(false);
    expect(transicaoStatusValida("NAO_ALCANCADA", "NOVA")).toBe(false);
  });

  it("mesmo status não é transição", () => {
    expect(transicaoStatusValida("NOVA", "NOVA")).toBe(false);
  });

  it("PACTACAO de metas: NOVA → CONCLUIDA direto permitido? Não — precisa passar por EM_ANDAMENTO", () => {
    expect(transicaoStatusValida("NOVA", "CONCLUIDA")).toBe(false);
  });
});

describe("care-plan/mural-schema comentarMural", () => {
  it("aceita texto razoável", () => {
    expect(
      muralInputSchema.safeParse({ texto: "Concordo com a meta proposta." })
        .success,
    ).toBe(true);
  });

  it("rejeita vazio/só espaços e texto gigante", () => {
    expect(muralInputSchema.safeParse({ texto: "   " }).success).toBe(false);
    expect(muralInputSchema.safeParse({ texto: "a".repeat(4001) }).success).toBe(
      false,
    );
  });
});
