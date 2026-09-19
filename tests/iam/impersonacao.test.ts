import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
  atorReal: {
    atorRealId: "",
    impersonando: false,
    usuarioSimuladoId: null as string | null,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// requirePermissao real redireciona (throw) quando falta permissão; o mock
// reproduz o mesmo formato. getAtorReal lê a sessão Auth.js — aqui vem do stub.
vi.mock("@/server/iam/session", () => ({
  requirePermissao: async (...chaves: string[]) => {
    if (!chaves.every((c) => sessao.chaves.includes(c))) {
      const { redirect } = await import("next/navigation");
      redirect("/");
    }
    return { id: sessao.actorId, basePapel: "ADMIN", status: "ATIVO" };
  },
  getAtorReal: async () => sessao.atorReal,
}));

import { db } from "@/lib/db";
import { encerrarImpersonacao, iniciarImpersonacao } from "@/server/iam/impersonacao";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
let papelAdminId: string;
let papelClinicoId: string;
const usuarioIds: string[] = [];

async function criarUsuario(papelId: string, status: "ATIVO" | "BLOQUEADO" = "ATIVO") {
  const u = await db.usuario.create({
    data: {
      cerId: CER_ID,
      email: `imp-${randomUUID().slice(0, 8)}@pts.local`,
      senhaHash: "hash-placeholder",
      nome: "Alvo Impersonação",
      categoria: "FISIOTERAPEUTA",
      papelId,
      status,
    },
  });
  usuarioIds.push(u.id);
  return u.id;
}

function auditorias(action: string, entityId: string) {
  return db.auditoria.findMany({ where: { action, entityType: "usuario", entityId } });
}

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;

  const [papelAdmin, papelClinico] = await Promise.all([
    db.papel.create({
      data: { cerId: CER_ID, nome: `ImpAdmin ${randomUUID().slice(0, 8)}`, base: "ADMIN" },
    }),
    db.papel.create({
      data: { cerId: CER_ID, nome: `ImpClin ${randomUUID().slice(0, 8)}`, base: "CLINICO" },
    }),
  ]);
  papelAdminId = papelAdmin.id;
  papelClinicoId = papelClinico.id;
});

beforeEach(() => {
  sessao.chaves = ["admin.usuarios.impersonar"];
  sessao.actorId = adminId;
  sessao.atorReal = { atorRealId: adminId, impersonando: false, usuarioSimuladoId: null };
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "usuario", entityId: { in: usuarioIds } },
  });
  await db.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
  await db.papel.deleteMany({ where: { id: { in: [papelAdminId, papelClinicoId] } } });
  await db.$disconnect();
});

describe("iam/impersonacao — iniciarImpersonacao", () => {
  it("sem admin.usuarios.impersonar recusa (redirect) e não audita", async () => {
    const alvo = await criarUsuario(papelClinicoId);
    sessao.chaves = ["admin.usuarios.ver"];

    await expect(iniciarImpersonacao(alvo)).rejects.toThrow();
    expect(await auditorias("usuario.impersonar.iniciar", alvo)).toHaveLength(0);
  });

  it("alvo inexistente devolve erro", async () => {
    const r = await iniciarImpersonacao(randomUUID());
    expect(r).toEqual({ ok: false, erro: "Usuário não encontrado." });
  });

  it.each([
    ["o próprio perfil", "self", "Não é possível simular o próprio perfil."],
    ["um administrador", "admin", "Não é possível simular um perfil administrador."],
    ["um usuário inativo", "inativo", "Usuário alvo não está ativo."],
  ] as const)("guardrail: não simula %s e não audita", async (_desc, caso, erro) => {
    let alvo: string;
    if (caso === "self") {
      alvo = await criarUsuario(papelClinicoId);
      sessao.actorId = alvo;
    } else if (caso === "admin") {
      alvo = await criarUsuario(papelAdminId);
    } else {
      alvo = await criarUsuario(papelClinicoId, "BLOQUEADO");
    }

    const r = await iniciarImpersonacao(alvo);
    expect(r).toEqual({ ok: false, erro });
    expect(await auditorias("usuario.impersonar.iniciar", alvo)).toHaveLength(0);
  });

  it("sucesso grava auditoria usuario.impersonar.iniciar com o ator real", async () => {
    const alvo = await criarUsuario(papelClinicoId);

    const r = await iniciarImpersonacao(alvo);
    expect(r).toEqual({ ok: true });

    const aud = await auditorias("usuario.impersonar.iniciar", alvo);
    expect(aud).toHaveLength(1);
    expect(aud[0].actorId).toBe(adminId);
  });
});

describe("iam/impersonacao — encerrarImpersonacao", () => {
  it("sem simulação ativa é no-op (não audita)", async () => {
    const antes = await db.auditoria.count({ where: { action: "usuario.impersonar.encerrar" } });
    expect(await encerrarImpersonacao()).toEqual({ ok: true });
    const depois = await db.auditoria.count({ where: { action: "usuario.impersonar.encerrar" } });
    expect(depois).toBe(antes);
  });

  it("encerra gravando auditoria com entityId do usuário simulado e actorId do ator real", async () => {
    const simulado = await criarUsuario(papelClinicoId);
    sessao.atorReal = { atorRealId: adminId, impersonando: true, usuarioSimuladoId: simulado };

    expect(await encerrarImpersonacao()).toEqual({ ok: true });

    const aud = await auditorias("usuario.impersonar.encerrar", simulado);
    expect(aud).toHaveLength(1);
    expect(aud[0].actorId).toBe(adminId);
  });
});
