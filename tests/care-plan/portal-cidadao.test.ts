import { describe, expect, it } from "vitest";

import {
  VALIDADE_PADRAO_DIAS,
  calcularExpiracao,
  formatarCodigo,
  gerarCodigo,
  hashCodigo,
  linkCidadao,
  normalizarCodigo,
} from "@/server/care-plan/portal-cidadao";

describe("gerarCodigo", () => {
  it("gera 10 caracteres sem letras/números ambíguos (Crockford)", () => {
    for (let i = 0; i < 200; i++) {
      const codigo = gerarCodigo();
      expect(codigo).toMatch(/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{10}$/);
    }
  });

  it("não repete códigos no mesmo lote", () => {
    const codigos = new Set(Array.from({ length: 500 }, () => gerarCodigo()));
    expect(codigos.size).toBe(500);
  });
});

describe("formatarCodigo", () => {
  it("agrupa em XXXXX-XXXXX para leitura e digitação", () => {
    expect(formatarCodigo("K7F29QMD3XZ")).toBe("K7F29-QMD3XZ");
  });
});

describe("normalizarCodigo", () => {
  it("aceita o código minúsculo, sem hífen, como o cidadão digitar", () => {
    expect(normalizarCodigo("k7f2-9qmd3xz")).toBe("K7F29QMD3XZ");
    expect(normalizarCodigo("k7f29qmd3xz")).toBe("K7F29QMD3XZ");
  });

  it("troca I/L/O/U pelos dígitos equivalentes (Crockford)", () => {
    expect(normalizarCodigo("IL0U-1234AB")).toBe("11001234AB");
  });

  it("remove espaços e underscores", () => {
    expect(normalizarCodigo(" k7f2_9qmd3xz ")).toBe("K7F29QMD3XZ");
  });
});

describe("hashCodigo", () => {
  it("é determinístico e não devolve o código cru", () => {
    const hash = hashCodigo("K7F29QMD3XZ");
    expect(hash).toBe(hashCodigo("K7F29QMD3XZ"));
    expect(hash).not.toContain("K7F29QMD3XZ");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("códigos diferentes geram hashes diferentes", () => {
    expect(hashCodigo("K7F29QMD3XZ")).not.toBe(hashCodigo("K7F29QMD3XY"));
  });
});

describe("calcularExpiracao", () => {
  const agora = new Date("2026-09-25T12:00:00.000Z");

  it("soma a validade padrão em dias", () => {
    expect(calcularExpiracao(agora)).toEqual(
      new Date(agora.getTime() + VALIDADE_PADRAO_DIAS * 24 * 60 * 60 * 1000),
    );
  });

  it("aceita prazo customizado", () => {
    expect(calcularExpiracao(agora, 7)).toEqual(
      new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000),
    );
  });
});

describe("linkCidadao", () => {
  it("monta a URL pública com o código no fim", () => {
    expect(linkCidadao("K7F29QMD3XZ", "http://localhost:3000")).toBe(
      "http://localhost:3000/portal-cidadao/K7F29-QMD3XZ",
    );
  });

  it("usa a base do ambiente quando AUTH_URL não vem", () => {
    expect(linkCidadao("K7F29QMD3XZ", undefined)).toBe(
      "http://localhost:3000/portal-cidadao/K7F29-QMD3XZ",
    );
  });
});
