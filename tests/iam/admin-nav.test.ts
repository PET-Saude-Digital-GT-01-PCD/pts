import { describe, expect, it } from "vitest";

import { ITENS_ADMIN, itensAdmin } from "@/server/iam/admin-nav";

describe("itensAdmin", () => {
  it("sem recursos administrativos, nenhuma aba aparece", () => {
    expect(itensAdmin([])).toEqual([]);
    expect(itensAdmin(["care-plan.meta.escrever"])).toEqual([]);
  });

  it("mostra só as abas cobertas pelos recursos do papel", () => {
    expect(itensAdmin(["admin.usuarios.ver"]).map((i) => i.chave)).toEqual([
      "usuarios",
    ]);
    expect(
      itensAdmin(["governanca.dashboard.ver"]).map((i) => i.chave),
    ).toEqual(["visao", "fluxo", "indicadores"]);
  });

  it("preserva a ordem do catálogo", () => {
    const todos = itensAdmin(
      ITENS_ADMIN.map((i) => i.requer).filter((r): r is string => r !== null),
    );
    expect(todos.map((i) => i.chave)).toEqual(ITENS_ADMIN.map((i) => i.chave));
  });
});
