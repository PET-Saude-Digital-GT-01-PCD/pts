import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({ chaves: [] as string[], actorId: "" }));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

vi.mock("@/server/iam/session", () => ({
  requirePermissao: async (...chaves: string[]) => {
    if (!chaves.every((c) => sessao.chaves.includes(c))) {
      const { redirect } = await import("next/navigation");
      redirect("/");
    }
    return { id: sessao.actorId };
  },
}));

import { db } from "@/lib/db";
import { aprovarUsuario } from "@/server/iam/admissao";

// Regressão #99: aprovar deixava o usuário com AUTOCADASTRO (zero recursos)
// até um 2º passo separado — quem esquecia o passo via "login quebrado".

const CER_ID = "00000000-0000-4000-8000-000000000001";

let autocadastroId: string;
let fisioPapelId: string;
let cerOutroId: string;
let papelOutroCerId: string;
const usuarioIds: string[] = [];

async function pendente() {
  const u = await db.usuario.create({
    data: {
      cerId: CER_ID,
      email: `aprov-${randomUUID().slice(0, 8)}@pts.local`,
      senhaHash: "hash-placeholder",
      nome: "Candidato Aprovação",
      categoria: "FISIOTERAPEUTA",
      papelId: autocadastroId,
      status: "PENDENTE",
    },
  });
  usuarioIds.push(u.id);
  return u.id;
}

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  sessao.actorId = admin.id;
  const [auto, fisio] = await Promise.all(
    ["AUTOCADASTRO", "FISIOTERAPEUTA"].map((nome) =>
      db.papel.findUniqueOrThrow({ where: { cerId_nome: { cerId: CER_ID, nome } } }),
    ),
  );
  autocadastroId = auto.id;
  fisioPapelId = fisio.id;
  const outro = await db.cer.create({
    data: { nome: `CER Aprov ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
  });
  cerOutroId = outro.id;
  const papel = await db.papel.create({
    data: { cerId: cerOutroId, nome: `Fisio fora ${randomUUID().slice(0, 4)}`, base: "CLINICO" },
  });
  papelOutroCerId = papel.id;
});

beforeEach(() => {
  sessao.chaves = ["admin.usuarios.aprovar", "admin.papeis.gerenciar"];
});

afterAll(async () => {
  await db.auditoria.deleteMany({ where: { entityType: "usuario", entityId: { in: usuarioIds } } });
  await db.usuario.deleteMany({ where: { id: { in: usuarioIds } } });
  await db.papel.delete({ where: { id: papelOutroCerId } });
  await db.cer.delete({ where: { id: cerOutroId } });
  await db.$disconnect();
});

describe("iam/admissao — aprovarUsuario com papel (#99)", () => {
  it("aprova já com o papel profissional, na mesma transação e auditado", async () => {
    const id = await pendente();
    expect(await aprovarUsuario(id, fisioPapelId)).toEqual({ ok: true });

    const u = await db.usuario.findUniqueOrThrow({ where: { id } });
    expect(u).toMatchObject({ status: "ATIVO", papelId: fisioPapelId });

    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "usuario", entityId: id, action: "usuario.aprovar" },
    });
    expect(aud.beforeJson).toMatchObject({ status: "PENDENTE", papelId: autocadastroId });
    expect(aud.afterJson).toMatchObject({ status: "ATIVO", papelId: fisioPapelId });
  });

  it("sem papel mantém o comportamento anterior (AUTOCADASTRO)", async () => {
    const id = await pendente();
    expect(await aprovarUsuario(id)).toEqual({ ok: true });
    const u = await db.usuario.findUniqueOrThrow({ where: { id } });
    expect(u).toMatchObject({ status: "ATIVO", papelId: autocadastroId });
  });

  it("escolher papel exige admin.papeis.gerenciar (mesma regra de atribuirPapelUsuario)", async () => {
    const id = await pendente();
    sessao.chaves = ["admin.usuarios.aprovar"];
    await expect(aprovarUsuario(id, fisioPapelId)).rejects.toThrow();
    const u = await db.usuario.findUniqueOrThrow({ where: { id } });
    expect(u.status).toBe("PENDENTE");
  });

  it("papel de outro CER ou inexistente é recusado e o usuário continua pendente", async () => {
    const id = await pendente();
    for (const papelId of [papelOutroCerId, randomUUID()]) {
      const r = await aprovarUsuario(id, papelId);
      expect(r.ok).toBe(false);
    }
    const u = await db.usuario.findUniqueOrThrow({ where: { id } });
    expect(u).toMatchObject({ status: "PENDENTE", papelId: autocadastroId });
  });
});
