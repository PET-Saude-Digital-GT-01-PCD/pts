import { describe, expect, it } from "vitest";

import {
  elegibilidadePorEscopo,
  type EscopoCER,
} from "@/server/triage/elegibilidade";

const TODOS: EscopoCER[] = ["FISICA", "INTELECTUAL", "VISUAL", "AUDITIVA"];

describe("triage/elegibilidade", () => {
  it("elegível por cada escopo", () => {
    expect(elegibilidadePorEscopo("M54.1", "dor cronica", ["FISICA"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("F71", "deficiencia intelectual", ["INTELECTUAL"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("H54.2", "cegueira", ["VISUAL"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("H90.3", "surdez", ["AUDITIVA"]).resultado).toBe("ELEGIVEL");
  });

  it("CID compatível com ≥1 de vários escopos → ELEGIVEL", () => {
    expect(elegibilidadePorEscopo("G80.0", "pc", TODOS).resultado).toBe("ELEGIVEL");
  });

  it("bordas de faixa: G00/G99 dentro; F69 e F90 fora da tabela v1 → REVISAO_MANUAL", () => {
    expect(elegibilidadePorEscopo("G00.9", "meningite", ["FISICA"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("G99.9", "trastorno nervoso", ["FISICA"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("F70.1", "leve", ["INTELECTUAL"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("F89", "ndev", ["INTELECTUAL"]).resultado).toBe("ELEGIVEL");
    // F69/F90: capítulo F só mapeado em 70–89 → fora da tabela v1
    expect(elegibilidadePorEscopo("F69", "outro", TODOS).resultado).toBe("REVISAO_MANUAL");
    expect(elegibilidadePorEscopo("F90.0", "tdah", TODOS).resultado).toBe("REVISAO_MANUAL");
  });

  it("bordas H53–H54 e H90–H91; H55 e H92 fora da tabela → REVISAO_MANUAL", () => {
    expect(elegibilidadePorEscopo("H53.0", "", ["VISUAL"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("H54.9", "", ["VISUAL"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("H55", "", TODOS).resultado).toBe("REVISAO_MANUAL");
    expect(elegibilidadePorEscopo("H90.0", "", ["AUDITIVA"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("H91.9", "", ["AUDITIVA"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("H92.0", "", TODOS).resultado).toBe("REVISAO_MANUAL");
  });

  it("S00–T98 físico inclui T; T99 fora da tabela", () => {
    expect(elegibilidadePorEscopo("S72.0", "fratura", ["FISICA"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("T98.0", "efeitos", ["FISICA"]).resultado).toBe("ELEGIVEL");
    expect(elegibilidadePorEscopo("T99", "outra", TODOS).resultado).toBe("REVISAO_MANUAL");
  });

  it("CID mapeado mas fora dos escopos do CER → NAO_ELEGIVEL com justificativa", () => {
    const r = elegibilidadePorEscopo("H90.0", "surdez", ["FISICA"]);
    expect(r.resultado).toBe("NAO_ELEGIVEL");
    expect(r.justificativa).toBeTruthy();
  });

  it("CID não mapeado → REVISAO_MANUAL (nunca reprovação automática)", () => {
    for (const cid of ["A15.0", "C50.1", "Z00.0"]) {
      const r = elegibilidadePorEscopo(cid, "qualquer", TODOS);
      expect(r.resultado).toBe("REVISAO_MANUAL");
      expect(r.justificativa).toBeTruthy();
    }
  });

  it("CID malformado → REVISAO_MANUAL (sem lançar erro)", () => {
    for (const cid of ["", "G", "G1", "GG00", "1234", "G999"]) {
      expect(() => elegibilidadePorEscopo(cid, "x", TODOS)).not.toThrow();
      expect(elegibilidadePorEscopo(cid, "x", TODOS).resultado).toBe("REVISAO_MANUAL");
    }
  });

  it("CID em minúscula é normalizado (g00 → G00) e classificado corretamente", () => {
    expect(elegibilidadePorEscopo("g00", "encaminhamento", ["FISICA"]).resultado).toBe("ELEGIVEL");
  });

  it("determinismo: mesmo input → mesmo resultado", () => {
    const a = elegibilidadePorEscopo("M54.1", "dor", ["FISICA"]);
    const b = elegibilidadePorEscopo("M54.1", "dor", ["FISICA"]);
    expect(a).toEqual(b);
  });
});
