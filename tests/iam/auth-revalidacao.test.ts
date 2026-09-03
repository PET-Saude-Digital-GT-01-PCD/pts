import { describe, expect, it, vi, beforeEach } from "vitest";

// jwt() da sessão não relê o banco por padrão — token fica válido por até
// ~30 dias mesmo se o usuário for bloqueado ou trocar de papel no meio do
// caminho. revalidarTokenSessao reconsulta o banco com TTL curto.
const dbMock = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { usuario: { findUnique: (...args: unknown[]) => dbMock.findUnique(...args) } },
}));

vi.mock("next-auth", () => ({ default: () => ({ handlers: {}, auth: async () => null, signIn: async () => {}, signOut: async () => {} }) }));
vi.mock("next-auth/providers/credentials", () => ({ default: () => ({}) }));

import { revalidarTokenSessao } from "@/lib/auth";

function tokenBase(overrides: Record<string, unknown> = {}) {
  return {
    sub: "usuario-1",
    papelId: "papel-antigo",
    basePapel: "CLINICO",
    nomePapel: "Antigo",
    status: "ATIVO",
    categoria: null,
    cerId: "cer-1",
    revalidadoEm: 0,
    ...overrides,
  };
}

beforeEach(() => {
  dbMock.findUnique.mockReset();
});

describe("lib/auth — revalidarTokenSessao", () => {
  it("dentro do TTL: não bate no banco, mantém o token", async () => {
    const token = tokenBase({ revalidadoEm: Date.now() });
    const resultado = await revalidarTokenSessao(token);
    expect(dbMock.findUnique).not.toHaveBeenCalled();
    expect(resultado).toBe(token);
  });

  it("fora do TTL, usuário BLOQUEADO no banco: token passa a refletir BLOQUEADO", async () => {
    dbMock.findUnique.mockResolvedValue({
      papelId: "papel-antigo",
      status: "BLOQUEADO",
      categoria: null,
      cerId: "cer-1",
      papel: { base: "CLINICO", nome: "Antigo" },
    });
    const token = tokenBase({ revalidadoEm: 0 });
    const resultado = await revalidarTokenSessao(token);
    expect(resultado.status).toBe("BLOQUEADO");
  });

  it("fora do TTL, papel trocado no banco: token reflete o novo papel sem novo login", async () => {
    dbMock.findUnique.mockResolvedValue({
      papelId: "papel-novo",
      status: "ATIVO",
      categoria: null,
      cerId: "cer-1",
      papel: { base: "GESTAO", nome: "Novo Papel" },
    });
    const token = tokenBase({ revalidadoEm: 0 });
    const resultado = await revalidarTokenSessao(token);
    expect(resultado.papelId).toBe("papel-novo");
    expect(resultado.nomePapel).toBe("Novo Papel");
  });

  it("usuário removido do banco: token vira BLOQUEADO", async () => {
    dbMock.findUnique.mockResolvedValue(null);
    const token = tokenBase({ revalidadoEm: 0 });
    const resultado = await revalidarTokenSessao(token);
    expect(resultado.status).toBe("BLOQUEADO");
  });
});
