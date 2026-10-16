import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({ actorId: "", cerId: "" }));

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
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
import { reprocessarEventoOutbound } from "@/server/integrations/outbound/actions";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
let cerOutroId: string;
let eventoProprioId: string;
let eventoOutroId: string;

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;
  sessao.actorId = adminId;
  sessao.cerId = CER_ID;

  const outro = await db.cer.create({
    data: { nome: `CER Reprocess ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
  });
  cerOutroId = outro.id;

  const criarFalho = (cerId: string) =>
    db.outboundEvent.create({
      data: {
        cerId,
        tipo: "REFERRAL",
        payloadJson: { x: randomUUID() },
        payloadHash: randomUUID().replace(/-/g, ""),
        status: "FAILED",
        attempts: 3,
        lastError: "falha simulada",
      },
      select: { id: true },
    });

  const [proprio, alheio] = await Promise.all([
    criarFalho(CER_ID),
    criarFalho(cerOutroId),
  ]);
  eventoProprioId = proprio.id;
  eventoOutroId = alheio.id;
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "outbound_event", entityId: { in: [eventoProprioId, eventoOutroId] } },
  });
  await db.outboundEvent.deleteMany({
    where: { id: { in: [eventoProprioId, eventoOutroId] } },
  });
  await db.cer.delete({ where: { id: cerOutroId } });
  await db.$disconnect();
});

describe("integrations/outbound — reprocessarEventoOutbound (escopo multi-CER)", () => {
  it("recusa reprocessar evento de outro CER (não vaza existência)", async () => {
    const r = await reprocessarEventoOutbound(eventoOutroId);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toBe("Evento não encontrado.");

    const alheio = await db.outboundEvent.findUniqueOrThrow({
      where: { id: eventoOutroId },
    });
    expect(alheio.status).toBe("FAILED");
  });

  it("reprocessa evento do próprio CER e registra auditoria no CER", async () => {
    const r = await reprocessarEventoOutbound(eventoProprioId);
    expect(r.ok).toBe(true);

    const proprio = await db.outboundEvent.findUniqueOrThrow({
      where: { id: eventoProprioId },
    });
    expect(proprio.status).toBe("PENDING");
    expect(proprio.attempts).toBe(0);

    const audit = await db.auditoria.findFirst({
      where: {
        action: "outbound_event.reprocessar",
        entityId: eventoProprioId,
      },
      select: { cerId: true, actorId: true },
    });
    expect(audit?.cerId).toBe(CER_ID);
    expect(audit?.actorId).toBe(adminId);
  });
});
