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
    it("identifica recursos soap.* e avaliacao.*", () => {
      expect(ehRecursoClinico("soap.ler")).toBe(true);
      expect(ehRecursoClinico("avaliacao.escrever")).toBe(true);
    });

    it("não marca recursos não-clínicos", () => {
      expect(ehRecursoClinico("dashboard.ver")).toBe(false);
      expect(ehRecursoClinico("triagem.ver")).toBe(false);
    });
  });

  describe("ehRecursoAdminOnly", () => {
    it("identifica recursos do grupo admin.*", () => {
      expect(ehRecursoAdminOnly("admin.papeis.gerenciar")).toBe(true);
      expect(ehRecursoAdminOnly("admin.config.org.editar")).toBe(true);
      expect(ehRecursoAdminOnly("admin.usuarios.aprovar")).toBe(true);
    });

    it("não marca demais recursos", () => {
      expect(ehRecursoAdminOnly("soap.ler")).toBe(false);
      expect(ehRecursoAdminOnly("governanca.dashboard.ver")).toBe(false);
    });
  });

  describe("validarRecursos", () => {
    it("GESTOR com recurso clínico viola", () => {
      const r = validarRecursos(BasePapel.GESTOR, ["dashboard.ver", "soap.ler"]);
      expect(r.ok).toBe(false);
      expect(r.violacoes).toHaveLength(1);
    });

    it("GESTOR com avaliacao.* viola", () => {
      expect(
        validarRecursos(BasePapel.GESTOR, ["avaliacao.escrever"]).ok,
      ).toBe(false);
    });

    it("CLINICO com recurso admin-only viola", () => {
      const r = validarRecursos(BasePapel.CLINICO, [
        "soap.ler",
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
      const recursos = ["soap.ler", "soap.escrever", "meta.ler", "mural.escrever"];
      expect(validarRecursos(BasePapel.CLINICO, recursos).ok).toBe(true);
    });

    it("lista vazia passa", () => {
      expect(validarRecursos(BasePapel.GESTOR, []).ok).toBe(true);
    });
  });

  describe("temPermissao", () => {
    it("concede quando recurso presente", () => {
      expect(temPermissao(["dashboard.ver", "soap.ler"], "dashboard.ver")).toBe(
        true,
      );
    });

    it("nega quando ausente", () => {
      expect(temPermissao(["dashboard.ver"], "soap.ler")).toBe(false);
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