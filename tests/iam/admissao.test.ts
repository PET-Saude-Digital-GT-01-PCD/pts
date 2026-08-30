import { describe, expect, it } from "vitest";

import { podeAprovar, podeRejeitar } from "@/server/iam/permissoes";

describe("iam/admissao — guardrails de aprovação (funções puras)", () => {
  describe("podeAprovar", () => {
    it("permite aprovar usuário PENDENTE", () => {
      expect(podeAprovar("PENDENTE")).toBe(true);
    });

    it("bloqueia aprovação de usuário ATIVO", () => {
      expect(podeAprovar("ATIVO")).toBe(false);
    });

    it("bloqueia aprovação de usuário BLOQUEADO", () => {
      expect(podeAprovar("BLOQUEADO")).toBe(false);
    });
  });

  describe("podeRejeitar", () => {
    it("permite rejeitar PENDENTE com motivo suficiente (≥ 10 chars)", () => {
      expect(podeRejeitar("PENDENTE", "Dados incompletos no formulário")).toBe(true);
    });

    it("bloqueia rejeição sem motivo", () => {
      expect(podeRejeitar("PENDENTE", "")).toBe(false);
    });

    it("bloqueia rejeição com motivo curto (< 10 chars)", () => {
      expect(podeRejeitar("PENDENTE", "Inválido")).toBe(false);
    });

    it("bloqueia rejeição com motivo só de espaços", () => {
      expect(podeRejeitar("PENDENTE", "          ")).toBe(false);
    });

    it("bloqueia rejeição de usuário ATIVO mesmo com motivo", () => {
      expect(podeRejeitar("ATIVO", "Motivo suficientemente longo")).toBe(false);
    });

    it("bloqueia rejeição de usuário BLOQUEADO", () => {
      expect(podeRejeitar("BLOQUEADO", "Motivo suficientemente longo")).toBe(false);
    });
  });
});
