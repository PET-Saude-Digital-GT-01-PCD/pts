import { describe, expect, it } from "vitest";
import { StatusPts } from "@prisma/client";

import {
  mensagemTransicaoInvalida,
  podeTransicionar,
  transicoesValidas,
} from "@/server/care-plan/maquina-status";

describe("care-plan/maquina-status", () => {
  describe("cadeia principal válida", () => {
    it("EM_AVALIACAO → PACTACAO → SEGUIMENTO → REAVALIACAO → EM_AVALIACAO", () => {
      expect(podeTransicionar("EM_AVALIACAO", "PACTACAO")).toBe(true);
      expect(podeTransicionar("PACTACAO", "SEGUIMENTO")).toBe(true);
      expect(podeTransicionar("SEGUIMENTO", "REAVALIACAO")).toBe(true);
      expect(podeTransicionar("REAVALIACAO", "EM_AVALIACAO")).toBe(true);
    });

    it("REAVALIACAO → FECHADO é a única porta de encerramento", () => {
      expect(podeTransicionar("REAVALIACAO", "FECHADO")).toBe(true);
      for (const de of ["EM_AVALIACAO", "PACTACAO", "SEGUIMENTO"] as const) {
        expect(podeTransicionar(de, "FECHADO")).toBe(false);
      }
    });
  });

  describe("transições inválidas", () => {
    it("pular etapas é recusado", () => {
      expect(podeTransicionar("EM_AVALIACAO", "SEGUIMENTO")).toBe(false);
      expect(podeTransicionar("EM_AVALIACAO", "REAVALIACAO")).toBe(false);
      expect(podeTransicionar("PACTACAO", "FECHADO")).toBe(false);
      expect(podeTransicionar("SEGUIMENTO", "EM_AVALIACAO")).toBe(false);
      expect(podeTransicionar("PACTACAO", "EM_AVALIACAO")).toBe(false);
    });

    it("recuar um passo é recusado (só via REAVALIACAO)", () => {
      expect(podeTransicionar("SEGUIMENTO", "PACTACAO")).toBe(false);
      expect(podeTransicionar("PACTACAO", "EM_AVALIACAO")).toBe(false);
    });

    it("mesmo status é recusado", () => {
      for (const s of Object.values(StatusPts)) {
        expect(podeTransicionar(s, s)).toBe(false);
      }
    });

    it("FECHADO é terminal", () => {
      expect(transicoesValidas("FECHADO")).toHaveLength(0);
      expect(podeTransicionar("FECHADO", "EM_AVALIACAO")).toBe(false);
    });
  });

  describe("mensagemTransicaoInvalida", () => {
    it("lista as transições válidas do estado atual", () => {
      const msg = mensagemTransicaoInvalida("EM_AVALIACAO", "FECHADO");
      expect(msg).toContain("inválida");
      expect(msg).toContain("PACTACAO");
    });

    it("estado terminal explica que não há saída", () => {
      const msg = mensagemTransicaoInvalida("FECHADO", "EM_AVALIACAO");
      expect(msg).toContain("FECHADO");
      expect(msg).toContain("terminal");
    });
  });
});
