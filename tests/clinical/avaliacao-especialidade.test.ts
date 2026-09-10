import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
  categoria: "FISIOTERAPEUTA" as string | null,
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
    categoria: sessao.categoria,
    cerId: "00000000-0000-4000-8000-000000000001",
  }),
  recursosDoUsuario: async () => sessao.chaves,
}));

import { db } from "@/lib/db";
import { criarAvaliacaoEspecialidade } from "@/server/clinical/avaliacao-especialidade";

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
  sessao.chaves = ["clinical.avaliacao.escrever"];
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
      nome: `Pac Fisio ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID, status, versao: 0, refProfissionalId: adminId },
  });
  ptsIds.push(pts.id);
  return pts;
}

describe("clinical/avaliacao-especialidade — criarAvaliacaoEspecialidade", () => {
  it("salva avaliação FISIO, NÃO bumpa versão do PTS (uniforme com soap.ts) e audita", async () => {
    const pts = await ptsAberto();
    const r = await criarAvaliacaoEspecialidade({
      especialidade: "FISIO",
      ptsId: pts.id,
      dadosJson: { mobilidade: true },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.cif).toContain("d410");

    const ptsDepois = await db.pts.findUniqueOrThrow({ where: { id: pts.id } });
    expect(ptsDepois.versao).toBe(pts.versao);

    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "avaliacao", entityId: r.avaliacaoId },
    });
    expect(aud.action).toBe("clinical.avaliacao.criar");
  });

  it("recusa avaliação em PTS FECHADO (somente leitura) e não bumpa versão", async () => {
    const pts = await ptsAberto("FECHADO");

    const r = await criarAvaliacaoEspecialidade({
      especialidade: "FISIO",
      ptsId: pts.id,
      dadosJson: { mobilidade: true },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("somente leitura");

    const ptsDepois = await db.pts.findUniqueOrThrow({ where: { id: pts.id } });
    expect(ptsDepois.versao).toBe(pts.versao);
  });
});
