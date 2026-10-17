import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({ actorId: "", cerId: "" }));

vi.mock("@/server/iam/session", () => ({
  requirePermissao: async () => ({
    id: sessao.actorId,
    nome: "Teste",
    email: "teste@pts.local",
    papelId: "papel-teste",
    basePapel: "ADMIN",
    nomePapel: "TESTE",
    status: "ATIVO",
    categoria: null,
    cerId: sessao.cerId,
  }),
}));

import { db } from "@/lib/db";
import { listarAuditoria, listarTiposEntidade } from "@/server/governance/auditoria";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
let cerOutroId: string;
const auditoriaIds: string[] = [];

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;
  sessao.actorId = adminId;
  sessao.cerId = CER_ID;

  const outro = await db.cer.create({
    data: { nome: `CER Audit ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
  });
  cerOutroId = outro.id;

  const criar = (cerId: string, entityType: string, action: string) =>
    db.auditoria.create({
      data: {
        cerId,
        actorId: adminId,
        action,
        entityType,
        entityId: randomUUID(),
      },
      select: { id: true },
    });

  const [a, b] = await Promise.all([
    criar(CER_ID, "pts", `teste.audit.a.${randomUUID().slice(0, 6)}`),
    criar(
      cerOutroId,
      "entidade_so_do_outro_cer",
      `teste.audit.b.${randomUUID().slice(0, 6)}`,
    ),
  ]);
  auditoriaIds.push(a.id, b.id);
});

afterAll(async () => {
  await db.auditoria.deleteMany({ where: { id: { in: auditoriaIds } } });
  await db.cer.delete({ where: { id: cerOutroId } });
  await db.$disconnect();
});

describe("governance/auditoria — escopo multi-CER", () => {
  it("listarAuditoria só devolve a trilha do CER do ator", async () => {
    const pagina = await listarAuditoria({});
    const ids = pagina.eventos.map((e) => e.id);
    expect(ids).toContain(auditoriaIds[0]);
    expect(ids).not.toContain(auditoriaIds[1]);
  });

  it("listarTiposEntidade não vaza tipos de entidade de outro CER", async () => {
    const tipos = await listarTiposEntidade();
    expect(tipos).toContain("pts");
    expect(tipos).not.toContain("entidade_so_do_outro_cer");
  });
});
