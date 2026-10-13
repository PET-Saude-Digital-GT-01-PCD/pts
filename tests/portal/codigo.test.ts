import { describe, expect, it } from "vitest";

import {
  codigoValido,
  gerarCodigo,
  hashCodigo,
  normalizarCodigo,
} from "@/server/portal/codigo";

describe("portal/codigo", () => {
  it("gera 10 chars do alfabeto Crockford (sem I/L/O/U)", () => {
    for (let i = 0; i < 50; i += 1) {
      const codigo = gerarCodigo();
      expect(codigo).toHaveLength(10);
      expect(codigoValido(codigo)).toBe(true);
      expect(codigo).not.toMatch(/[ILOU]/);
    }
  });

  it("normaliza caixa, separadores e leituras erradas (I/L→1, O→0)", () => {
    expect(normalizarCodigo(" ab-c d ")).toBe("ABCD");
    expect(normalizarCodigo("ilo")).toBe("110");
    expect(normalizarCodigo("7k3m 9p2q")).toBe("7K3M9P2Q");
  });

  it("rejeita tamanho errado e caractere fora do alfabeto", () => {
    expect(codigoValido("ABC")).toBe(false);
    expect(codigoValido("ABCDEFGHIU")).toBe(false); // U fora do alfabeto
    expect(codigoValido("7K3M9P2QR4")).toBe(true);
  });

  it("hash é determinístico e sensível ao código", () => {
    expect(hashCodigo("7K3M9P2QR4")).toBe(hashCodigo("7K3M9P2QR4"));
    expect(hashCodigo("7K3M9P2QR4")).not.toBe(hashCodigo("7K3M9P2QR5"));
  });
});
