import { describe, expect, it } from "vitest";
import type { Escopo } from "@prisma/client";
import { elegibilidadePorEscopo } from "@/server/triage/elegibilidade";

const casosElegiveis: Array<[string, Escopo]> = [
  ["G00", "FISICA"],
  ["G99", "FISICA"],
  ["M00", "FISICA"],
  ["M99", "FISICA"],
  ["S00", "FISICA"],
  ["S99", "FISICA"],
  ["T00", "FISICA"],
  ["T98", "FISICA"],
  ["F70", "INTELECTUAL"],
  ["F89", "INTELECTUAL"],
  ["H53", "VISUAL"],
  ["H54", "VISUAL"],
  ["H90", "AUDITIVA"],
  ["H91", "AUDITIVA"],
];

describe("elegibilidadePorEscopo", () => {
  it.each(casosElegiveis)(
    "classifica o CID %s como elegível no escopo %s",
    (cid, escopo) => {
      expect(elegibilidadePorEscopo(cid, "encaminhamento", [escopo])).toEqual({
        resultado: "ELEGIVEL",
      });
    },
  );

  it("aceita CID em minúsculas, com espaços e subcategoria", () => {
    expect(elegibilidadePorEscopo("  g80.0  ", "encaminhamento", ["FISICA"])).toEqual({
      resultado: "ELEGIVEL",
    });
  });

  it("é elegível quando ao menos um dos escopos do CER é compatível", () => {
    expect(
      elegibilidadePorEscopo("H90.3", "encaminhamento", ["VISUAL", "AUDITIVA"]),
    ).toEqual({ resultado: "ELEGIVEL" });
  });

  it("classifica como não elegível quando o CID é mapeado para outro escopo", () => {
    const resultado = elegibilidadePorEscopo("H90", "encaminhamento", ["FISICA"]);

    expect(resultado).toEqual({
      resultado: "NAO_ELEGIVEL",
      justificativa:
        "O CID informado pertence a um escopo de reabilitação não oferecido por este CER.",
    });
  });

  it("classifica como não elegível quando o CER não declara nenhum escopo", () => {
    expect(elegibilidadePorEscopo("F70", "encaminhamento", [])).toMatchObject({
      resultado: "NAO_ELEGIVEL",
      justificativa: expect.any(String),
    });
  });

  it.each(["F69", "F90", "H52", "H55", "H89", "H92", "T99", "Z00"])(
    "encaminha o CID não mapeado %s para revisão manual",
    (cid) => {
      expect(elegibilidadePorEscopo(cid, "encaminhamento", ["FISICA"])).toEqual({
        resultado: "REVISAO_MANUAL",
      });
    },
  );

  it("encaminha CID vazio ou inválido para revisão manual", () => {
    expect(elegibilidadePorEscopo("", "encaminhamento", ["FISICA"])).toEqual({
      resultado: "REVISAO_MANUAL",
    });
    expect(elegibilidadePorEscopo("não é CID", "encaminhamento", ["FISICA"])).toEqual({
      resultado: "REVISAO_MANUAL",
    });
  });

  it("produz sempre o mesmo resultado para a mesma entrada", () => {
    const escopos: Escopo[] = ["INTELECTUAL", "VISUAL"];
    const primeiraExecucao = elegibilidadePorEscopo("F79", "avaliação", escopos);
    const segundaExecucao = elegibilidadePorEscopo("F79", "avaliação", escopos);

    expect(segundaExecucao).toEqual(primeiraExecucao);
    expect(escopos).toEqual(["INTELECTUAL", "VISUAL"]);
  });
});
