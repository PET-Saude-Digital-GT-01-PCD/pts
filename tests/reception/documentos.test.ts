import { describe, expect, it } from "vitest";

import { validarCns, validarCpf } from "@/server/reception/documentos";

describe("validarCpf", () => {
  it.each([
    "529.982.247-25",
    "52998224725",
    "111.444.777-35",
  ])("aceita CPF válido %s", (cpf) => {
    expect(validarCpf(cpf)).toBe(true);
  });

  it.each([
    "11111111111",
    "529.982.247-26",
    "123456789",
    "",
    "abcdefghijk",
  ])("recusa CPF inválido %s", (cpf) => {
    expect(validarCpf(cpf)).toBe(false);
  });
});

describe("validarCns", () => {
  it.each([
    "100 0000 0000 0031",
    "100000000000031",
    "700000000000021",
    "800000000000001",
  ])("aceita CNS válido %s", (cns) => {
    expect(validarCns(cns)).toBe(true);
  });

  it.each([
    "100000000000032",
    "300000000000000",
    "12345",
    "",
  ])("recusa CNS inválido %s", (cns) => {
    expect(validarCns(cns)).toBe(false);
  });
});
