import { describe, expect, it } from "vitest";
import { BasePapel } from "@prisma/client";

import {
  ehRecursoAdminOnly,
  ehRecursoClinico,
  podeDeletarPapel,
  temPermissao,
  validarRecursos,
} from "@/server/iam/permissoes";

describe("iam/permissoes", () => {
  describe("ehRecursoClinico", () => {
    it("identifica recursos do grupo clinical (soap.* e avaliacao.*)", () => {
      expect(ehRecursoClinico("clinical.soap.ler")).toBe(true);
      expect(ehRecursoClinico("clinical.avaliacao.escrever")).toBe(true);
    });

    it("não marca recursos não-clínicos", () => {
      expect(ehRecursoClinico("governanca.dashboard.ver")).toBe(false);
      expect(ehRecursoClinico("triage.triagem.ver")).toBe(false);
    });
  });

  describe("ehRecursoAdminOnly", () => {
    it("identifica recursos do grupo admin.*", () => {
      expect(ehRecursoAdminOnly("admin.papeis.gerenciar")).toBe(true);
      expect(ehRecursoAdminOnly("admin.config.org.editar")).toBe(true);
      expect(ehRecursoAdminOnly("admin.usuarios.aprovar")).toBe(true);
    });

    it("não marca demais recursos", () => {
      expect(ehRecursoAdminOnly("clinical.soap.ler")).toBe(false);
      expect(ehRecursoAdminOnly("governanca.dashboard.ver")).toBe(false);
    });
  });

  describe("validarRecursos", () => {
    it("GESTOR com recurso clínico viola", () => {
      const r = validarRecursos(BasePapel.GESTOR, [
        "governanca.dashboard.ver",
        "clinical.soap.ler",
      ]);
      expect(r.ok).toBe(false);
      expect(r.violacoes).toHaveLength(1);
    });

    it("GESTOR com clinical.avaliacao.* viola", () => {
      expect(
        validarRecursos(BasePapel.GESTOR, ["clinical.avaliacao.escrever"]).ok,
      ).toBe(false);
    });

    it("CLINICO com recurso admin-only viola", () => {
      const r = validarRecursos(BasePapel.CLINICO, [
        "clinical.soap.ler",
        "admin.papeis.gerenciar",
      ]);
      expect(r.ok).toBe(false);
      expect(r.violacoes).toHaveLength(1);
    });

    it("ADMIN com recurso admin-only passa", () => {
      expect(
        validarRecursos(BasePapel.ADMIN, [
          "admin.papeis.gerenciar",
          "admin.config.org.editar",
          "admin.usuarios.aprovar",
        ]).ok,
      ).toBe(true);
    });

    it("matriz válida de papel clínico passa", () => {
      const recursos = [
        "clinical.soap.ler",
        "clinical.soap.escrever",
        "care-plan.meta.ler",
        "care-plan.mural.escrever",
      ];
      expect(validarRecursos(BasePapel.CLINICO, recursos).ok).toBe(true);
    });

    it("lista vazia passa", () => {
      expect(validarRecursos(BasePapel.GESTOR, []).ok).toBe(true);
    });
  });

  describe("temPermissao", () => {
    it("concede quando recurso presente", () => {
      expect(
        temPermissao(
          ["governanca.dashboard.ver", "clinical.soap.ler"],
          "governanca.dashboard.ver",
        ),
      ).toBe(true);
    });

    it("nega quando ausente", () => {
      expect(temPermissao(["governanca.dashboard.ver"], "clinical.soap.ler")).toBe(
        false,
      );
    });
  });

  describe("podeDeletarPapel", () => {
    it("bloqueia papel em uso", () => {
      expect(podeDeletarPapel(true, false)).toBe(false);
    });

    it("bloqueia último admin ativo", () => {
      expect(podeDeletarPapel(false, true)).toBe(false);
    });

    it("permite deletar papel livre", () => {
      expect(podeDeletarPapel(false, false)).toBe(true);
    });
  });
});