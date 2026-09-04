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
import { criarAvaliacaoSoap } from "@/server/clinical/soap";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

const dadosSoap = {
  subjetivo: "Relata dor ao deambular.",
  objetivo: "Marcha claudicante.",
  avaliacao: "Disfunção musculoesquelética em progressão.",
  plano: { gradeServicos: [] },
};

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  adminId = admin.id;
  sessao.actorId = adminId;
  sessao.chaves = ["clinical.soap.escrever"];
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "avaliacao", actorId: adminId },
  });
  await db.avaliacao.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

async function ptsAberto(status: "EM_AVALIACAO" | "FECHADO" = "EM_AVALIACAO") {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Pac SOAP ${randomUUID().slice(0, 8)}`,
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

describe("clinical/soap — criarAvaliacaoSoap", () => {
  it("salva avaliação SOAP com auditoria na mesma transação", async () => {
    const pts = await ptsAberto();
    const r = await criarAvaliacaoSoap({ ptsId: pts.id, dadosJson: dadosSoap });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const avaliacao = await db.avaliacao.findUniqueOrThrow({
      where: { id: r.avaliacaoId },
    });
    expect(avaliacao.ptsId).toBe(pts.id);
    expect(avaliacao.avaliadorId).toBe(adminId);

    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "avaliacao", entityId: r.avaliacaoId },
    });
    expect(aud.action).toBe("clinical.soap.criar");
  });

  it("recusa avaliação em PTS FECHADO (somente leitura) e não persiste", async () => {
    const pts = await ptsAberto("FECHADO");
    const antes = await db.avaliacao.count({ where: { ptsId: pts.id } });

    const r = await criarAvaliacaoSoap({ ptsId: pts.id, dadosJson: dadosSoap });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("somente leitura");
    expect(await db.avaliacao.count({ where: { ptsId: pts.id } })).toBe(antes);
  });

  it("recusa sem permissão", async () => {
    sessao.chaves = [];
    const pts = await ptsAberto();
    const r = await criarAvaliacaoSoap({ ptsId: pts.id, dadosJson: dadosSoap });
    expect(r.ok).toBe(false);
    sessao.chaves = ["clinical.soap.escrever"];
  });
});
