import { describe, expect, it, vi } from "vitest";

// getCurrentUser/requireAuth precisam recusar sessão com status não-ATIVO
// mesmo que o token ainda carregue dados velhos (revalidação é em src/lib/auth.ts;
// aqui testamos a camada de reforço que nunca trata status != ATIVO como logado).
const authMock = vi.hoisted(() => ({ session: null as unknown }));

vi.mock("@/lib/auth", () => ({
  auth: async () => authMock.session,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { getCurrentUser, requireAuth } from "@/server/iam/session";

function sessaoDe(status: "ATIVO" | "PENDENTE" | "BLOQUEADO") {
  return {
    user: {
      id: "usuario-1",
      nome: "Teste",
      email: "teste@pts.local",
      papelId: "papel-1",
      basePapel: "CLINICO",
      nomePapel: "Teste",
      status,
      categoria: null,
      cerId: null,
    },
  };
}

describe("iam/session — getCurrentUser/requireAuth revalidam status", () => {
  it("usuário ATIVO: getCurrentUser retorna a sessão", async () => {
    authMock.session = sessaoDe("ATIVO");
    const user = await getCurrentUser();
    expect(user?.status).toBe("ATIVO");
  });

  it("token com status BLOQUEADO: getCurrentUser retorna null", async () => {
    authMock.session = sessaoDe("BLOQUEADO");
    expect(await getCurrentUser()).toBeNull();
  });

  it("token com status PENDENTE: getCurrentUser retorna null", async () => {
    authMock.session = sessaoDe("PENDENTE");
    expect(await getCurrentUser()).toBeNull();
  });

  it("usuário bloqueado (via token revalidado): requireAuth redireciona para /login", async () => {
    authMock.session = sessaoDe("BLOQUEADO");
    await expect(requireAuth()).rejects.toThrow("REDIRECT:/login");
  });

  it("sem sessão: requireAuth redireciona para /login", async () => {
    authMock.session = null;
    await expect(requireAuth()).rejects.toThrow("REDIRECT:/login");
  });
});
