import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
}));

vi.mock("@/server/iam/session", () => ({
  requireAuth: async () => ({
    id: sessao.actorId,
    nome: "Teste",
    email: "teste@pts.local",
    papelId: "papel-teste",
    basePapel: "CLINICO",
    nomePapel: "TESTE",
    status: "ATIVO",
    categoria: null,
    cerId: "00000000-0000-4000-8000-000000000001",
  }),
  recursosDoUsuario: async () => sessao.chaves,
}));

import { db } from "@/lib/db";
import { registrarEvento, temFaltaRecente } from "@/server/care-plan/eventos";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;
  sessao.actorId = adminId;
  sessao.chaves = ["care-plan.pts.revisar"];
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "evento_cuidado", actorId: adminId },
  });
  await db.eventoCuidado.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

async function ptsAberto(status: "EM_AVALIACAO" | "FECHADO" = "EM_AVALIACAO") {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Pac Evento ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID, status, refProfissionalId: adminId },
  });
  ptsIds.push(pts.id);
  return pts;
}

describe("care-plan/eventos — registrarEvento", () => {
  it("salva evento com FK RESTRICT e auditoria na mesma transação", async () => {
    const pts = await ptsAberto();
    const data = new Date("2026-08-20T14:00Z");

    const r = await registrarEvento({
      ptsId: pts.id,
      tipo: "SESSAO",
      data,
      observacao: "Sessão de fisioterapia.",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const evento = await db.eventoCuidado.findUniqueOrThrow({
      where: { id: r.eventoId },
      include: { pts: { select: { id: true } }, registradoPor: { select: { id: true } } },
    });
    expect(evento.ptsId).toBe(pts.id);
    expect(evento.registradoPorId).toBe(adminId);
    expect(evento.tipo).toBe("SESSAO");

    // FK RESTRICT: tentar apagar o PTS com evento vinculado deve falhar.
    await expect(db.pts.delete({ where: { id: pts.id } })).rejects.toThrow();

    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "evento_cuidado", entityId: r.eventoId },
    });
    expect(aud.action).toBe("evento_cuidado.registrar");
    expect(aud.afterJson).toMatchObject({ tipo: "SESSAO" });
  });

  it("recusa evento em PTS FECHADO (somente leitura)", async () => {
    const pts = await ptsAberto("FECHADO");

    const r = await registrarEvento({
      ptsId: pts.id,
      tipo: "OUTRO",
      data: new Date(),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("somente leitura");
  });

  it("recusa sem permissão (nem revisar nem avaliação)", async () => {
    sessao.chaves = ["governanca.dashboard.ver"];
    const pts = await ptsAberto();
    await expect(
      registrarEvento({ ptsId: pts.id, tipo: "SESSAO", data: new Date() }),
    ).rejects.toThrow(/permiss/i);
  });

  it("temFaltaRecente detecta FALTA dos últimos 30 dias", async () => {
    const pts = await ptsAberto();
    await db.eventoCuidado.create({
      data: {
        ptsId: pts.id,
        tipo: "FALTA",
        data: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        registradoPorId: adminId,
      },
    });
    expect(await temFaltaRecente(pts.id)).toBe(true);
  });

  it("temFaltaRecente ignora FALTA antiga (>30 dias)", async () => {
    const pts = await ptsAberto();
    await db.eventoCuidado.create({
      data: {
        ptsId: pts.id,
        tipo: "FALTA",
        data: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        registradoPorId: adminId,
      },
    });
    expect(await temFaltaRecente(pts.id)).toBe(false);
  });
});
