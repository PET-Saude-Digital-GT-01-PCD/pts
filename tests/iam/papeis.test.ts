import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
  cerId: "",
}));

// revalidatePath exige escopo de request do Next.js; fora dele (nos testes)
// lançaria e cairia no catch genérico do usecase, mascarando o resultado.
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

// requirePermissao real redireciona (throw) quando falta permissão; o mock
// reproduz o mesmo formato para exercitar o mesmo caminho que a UI vê.
vi.mock("@/server/iam/session", () => ({
  requirePermissao: async (...chaves: string[]) => {
    const possuiTodas = chaves.every((c) => sessao.chaves.includes(c));
    if (!possuiTodas) {
      const { redirect } = await import("next/navigation");
      redirect("/");
    }
    return {
      id: sessao.actorId,
      nome: "Teste",
      email: "teste@pts.local",
      papelId: "papel-teste",
      basePapel: "ADMIN",
      nomePapel: "TESTE",
      status: "ATIVO",
      categoria: null,
      cerId: sessao.cerId,
    };
  },
}));

import { db } from "@/lib/db";
import { atribuirPapelUsuario } from "@/server/iam/papeis";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let actorId: string;
let papelOrigemId: string;
let papelDestinoId: string;
let usuarioId: string;

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  actorId = admin.id;
  sessao.actorId = actorId;
  sessao.cerId = CER_ID;

  const [origem, destino] = await Promise.all([
    db.papel.create({
      data: { cerId: CER_ID, nome: `Origem ${randomUUID().slice(0, 8)}`, base: "CLINICO" },
    }),
    db.papel.create({
      data: { cerId: CER_ID, nome: `Destino ${randomUUID().slice(0, 8)}`, base: "CLINICO" },
    }),
  ]);
  papelOrigemId = origem.id;
  papelDestinoId = destino.id;

  const usuario = await db.usuario.create({
    data: {
      cerId: CER_ID,
      email: `alvo-${randomUUID().slice(0, 8)}@pts.local`,
      senhaHash: "hash-placeholder",
      nome: "Usuário Alvo",
      categoria: "MEDICO",
      papelId: papelOrigemId,
    },
  });
  usuarioId = usuario.id;
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "usuario", entityId: usuarioId },
  });
  await db.usuario.delete({ where: { id: usuarioId } });
  await db.papel.deleteMany({ where: { id: { in: [papelOrigemId, papelDestinoId] } } });
  await db.$disconnect();
});

describe("iam/papeis — atribuirPapelUsuario", () => {
  it("só admin.usuarios.ver (sem admin.papeis.gerenciar) recusa e não altera", async () => {
    sessao.chaves = ["admin.usuarios.ver"];
    await expect(
      atribuirPapelUsuario(usuarioId, papelDestinoId),
    ).rejects.toThrow();

    const usuario = await db.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    expect(usuario.papelId).toBe(papelOrigemId);
  });

  it("com admin.papeis.gerenciar reatribui e audita na mesma transação", async () => {
    sessao.chaves = ["admin.papeis.gerenciar"];
    const r = await atribuirPapelUsuario(usuarioId, papelDestinoId);
    expect(r.ok).toBe(true);

    const usuario = await db.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    expect(usuario.papelId).toBe(papelDestinoId);

    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "usuario", entityId: usuarioId, action: "usuario.papel.atribuir" },
    });
    expect(aud.beforeJson).toMatchObject({ papelId: papelOrigemId });
    expect(aud.afterJson).toMatchObject({ papelId: papelDestinoId });
  });
});
