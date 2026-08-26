import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

// Sessão mockada: usecases dependem do usuário logado; o resto é DB real.
const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
  cerId: "",
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
    cerId: sessao.cerId,
  }),
  recursosDoUsuario: async () => sessao.chaves,
}));

import { db } from "@/lib/db";
import {
  atualizarSemaforoReuniao,
  type Resultado,
} from "@/server/care-plan/atualizar-semaforo";
import {
  semaforoDeReuniao,
} from "@/server/care-plan/semaforo-reuniao";
import type { EntradaReuniao } from "@/server/care-plan/semaforo-reuniao";

function falhou(
  r: Resultado,
): asserts r is { ok: false; erro: string; codigo?: number } {
  expect(r.ok).toBe(false);
}

const CER_ID = "00000000-0000-4000-8000-000000000001";

const base: EntradaReuniao = {
  divergenciaEspecialidades: false,
  conflitosMeta: 0,
  eventoRisco: false,
  pendenciaAjuste: false,
};

let adminId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

async function criarPts(): Promise<{ id: string; versao: number }> {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Semáforo ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID },
  });
  ptsIds.push(pts.id);
  return { id: pts.id, versao: pts.versao };
}

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;
  sessao.actorId = adminId;
  sessao.cerId = CER_ID;
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "pts", entityId: { in: ptsIds }, actorId: adminId },
  });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

describe("care-plan/semaforo-reuniao — função pura", () => {
  it("classifica os 3 estados e é determinística", () => {
    expect(semaforoDeReuniao(base)).toBe("VERDE");
    expect(semaforoDeReuniao({ ...base, pendenciaAjuste: true })).toBe(
      "AMARELO",
    );
    expect(semaforoDeReuniao({ ...base, eventoRisco: true })).toBe("VERMELHO");
    expect(semaforoDeReuniao(base)).toBe(semaforoDeReuniao({ ...base }));
  });

  it("limite: conflitosMeta 0 vs 1 separa VERDE de VERMELHO", () => {
    expect(semaforoDeReuniao({ ...base, conflitosMeta: 0 })).toBe("VERDE");
    expect(semaforoDeReuniao({ ...base, conflitosMeta: 1 })).toBe("VERMELHO");
  });
});

describe("care-plan/atualizarSemaforoReuniao — action", () => {
  it("sem permissão retorna erro", async () => {
    sessao.chaves = [];
    const pts = await criarPts();
    const r = await atualizarSemaforoReuniao({
      ptsId: pts.id,
      ...base,
      version: pts.versao,
    });
    falhou(r);
    expect(r.codigo).toBeUndefined();
  });

  it("atualiza com auditoria same-tx e bump de versão", async () => {
    sessao.chaves = ["care-plan.pts.revisar"];
    const pts = await criarPts();

    const r = await atualizarSemaforoReuniao(
      { ptsId: pts.id, ...base, pendenciaAjuste: true, version: pts.versao },
      "ajuste combinado na reunião",
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.classificacao).toBe("AMARELO");

    const depois = await db.pts.findUniqueOrThrow({ where: { id: pts.id } });
    expect(depois.semaforoReuniao).toBe("AMARELO");
    expect(depois.versao).toBe(pts.versao + 1);

    const auditorias = await db.auditoria.findMany({
      where: { entityType: "pts", entityId: pts.id, action: "pts.semaforo_reuniao" },
    });
    expect(auditorias).toHaveLength(1);
    expect(auditorias[0]?.motivo).toBe("ajuste combinado na reunião");
  });

  it("versão velha → conflito 409 e PTS intocado", async () => {
    sessao.chaves = ["care-plan.pts.revisar"];
    const pts = await criarPts();

    const r = await atualizarSemaforoReuniao({
      ptsId: pts.id,
      ...base,
      eventoRisco: true,
      version: pts.versao + 99,
    });
    falhou(r);
    expect(r.codigo).toBe(409);

    const depois = await db.pts.findUniqueOrThrow({ where: { id: pts.id } });
    expect(depois.semaforoReuniao).toBe("VERDE");
    expect(depois.versao).toBe(pts.versao);
  });

  it("payload inválido rejeitado sem tocar o banco", async () => {
    sessao.chaves = ["care-plan.pts.revisar"];
    const pts = await criarPts();
    const r = await atualizarSemaforoReuniao({
      ptsId: pts.id,
      ...base,
      conflitosMeta: -1,
      version: pts.versao,
    });
    falhou(r);
    expect(r.codigo).toBeUndefined();
  });
});
