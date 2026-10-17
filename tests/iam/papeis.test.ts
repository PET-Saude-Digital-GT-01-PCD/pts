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
import {
  atualizarPapel,
  atribuirPapelUsuario,
  deletarPapel,
} from "@/server/iam/papeis";

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

  it("não atribui papel a usuário de outro CER (isolamento multi-CER)", async () => {
    const cer = await db.cer.create({
      data: { nome: `CER Pap ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
    });
    const papel = await db.papel.create({
      data: { cerId: cer.id, nome: `PapFora ${randomUUID().slice(0, 4)}`, base: "CLINICO" },
    });
    const fora = await db.usuario.create({
      data: {
        cerId: cer.id,
        email: `pap-fora-${randomUUID().slice(0, 8)}@pts.local`,
        senhaHash: "hash-placeholder",
        nome: "Usuário de outro CER",
        categoria: "MEDICO",
        papelId: papel.id,
      },
    });

    sessao.chaves = ["admin.papeis.gerenciar"];
    expect(await atribuirPapelUsuario(fora.id, papel.id)).toEqual({
      ok: false,
      erro: "Usuário não pertence ao seu CER.",
    });

    await db.usuario.delete({ where: { id: fora.id } });
    await db.papel.delete({ where: { id: papel.id } });
    await db.cer.delete({ where: { id: cer.id } });
  });
});

describe("iam/papeis — escopo multi-CER de papéis", () => {
  it("não edita nem deleta papel de outro CER", async () => {
    sessao.chaves = ["admin.papeis.gerenciar"];
    const cer = await db.cer.create({
      data: { nome: `CER Pap2 ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
    });
    const papel = await db.papel.create({
      data: { cerId: cer.id, nome: `PapFora2 ${randomUUID().slice(0, 4)}`, base: "CLINICO" },
    });

    expect(
      await atualizarPapel(papel.id, { nome: "Renomeado", base: "CLINICO", recursos: [] }),
    ).toEqual({ ok: false, erro: "Papel não encontrado." });
    expect(await deletarPapel(papel.id)).toEqual({
      ok: false,
      erro: "Papel não encontrado.",
    });

    const ainda = await db.papel.findUnique({ where: { id: papel.id } });
    expect(ainda?.nome).not.toBe("Renomeado");

    await db.papel.delete({ where: { id: papel.id } });
    await db.cer.delete({ where: { id: cer.id } });
  });

  it("trava do '≥1 admin' conta só admins ativos do próprio CER", async () => {
    sessao.chaves = ["admin.papeis.gerenciar"];
    // CER dedicado: isola a contagem da concorrência de outros arquivos de
    // teste que criam admins ativos no CER padrão.
    const cer = await db.cer.create({
      data: { nome: `CER Admin ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
    });
    const cerAlheio = await db.cer.create({
      data: { nome: `CER Alheio ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
    });
    const papelFora = await db.papel.create({
      data: { cerId: cerAlheio.id, nome: `AdminFora ${randomUUID().slice(0, 4)}`, base: "ADMIN" },
    });
    // "Prova" de que há mais de um admin no sistema, mas em outro CER.
    await db.usuario.createMany({
      data: [1, 2].map((i) => ({
        cerId: cerAlheio.id,
        email: `admin-fora-${i}-${randomUUID().slice(0, 6)}@pts.local`,
        senhaHash: "hash-placeholder",
        nome: `Admin Fora ${i}`,
        categoria: "MEDICO" as const,
        papelId: papelFora.id,
        status: "ATIVO" as const,
      })),
    });

    const papelAdminUnico = await db.papel.create({
      data: { cerId: cer.id, nome: `AdminUnico ${randomUUID().slice(0, 4)}`, base: "ADMIN" },
    });
    // Único admin ativo do CER do ator.
    await db.usuario.create({
      data: {
        cerId: cer.id,
        email: `admin-unico-${randomUUID().slice(0, 6)}@pts.local`,
        senhaHash: "hash-placeholder",
        nome: "Admin Único",
        categoria: "MEDICO",
        papelId: papelAdminUnico.id,
        status: "ATIVO",
      },
    });
    // Papel ADMIN vazio no CER do ator: com a contagem global antiga, seria
    // deletável (3 admins no sistema); com o escopo por CER, deve ser barrado.
    const papelVazio = await db.papel.create({
      data: { cerId: cer.id, nome: `AdminVazio ${randomUUID().slice(0, 4)}`, base: "ADMIN" },
    });

    sessao.cerId = cer.id;
    try {
      expect(await deletarPapel(papelVazio.id)).toEqual({
        ok: false,
        erro: "Deve haver ao menos um admin ativo.",
      });
    } finally {
      sessao.cerId = CER_ID;
    }

    await db.usuario.deleteMany({
      where: { cerId: { in: [cer.id, cerAlheio.id] } },
    });
    await db.papel.deleteMany({
      where: { id: { in: [papelVazio.id, papelAdminUnico.id, papelFora.id] } },
    });
    await db.cer.deleteMany({ where: { id: { in: [cer.id, cerAlheio.id] } } });
  });
});
