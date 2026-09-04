import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

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
  requirePermissao: async (...chaves: string[]) => {
    const possuiTodas = chaves.every((c) => sessao.chaves.includes(c));
    if (!possuiTodas) throw new Error("Sem permissão para esta ação.");
    return {
      id: sessao.actorId,
      nome: "Teste",
      email: "teste@pts.local",
      papelId: "papel-teste",
      basePapel: "CLINICO",
      nomePapel: "TESTE",
      status: "ATIVO",
      categoria: null,
      cerId: sessao.cerId,
    };
  },
}));

import { db } from "@/lib/db";
import {
  buscarContrarreferencia,
  emitirContrarreferencia,
  listarContrarreferenciasPts,
} from "@/server/triage/contrarreferencia";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];
const guiaIds: string[] = [];

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
    where: { entityType: "contrarreferencia", entityId: { in: guiaIds } },
  });
  await db.contrarreferencia.deleteMany({ where: { id: { in: guiaIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

async function criarPaciente() {
  const p = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Contrarref ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(p.id);
  return p.id;
}

async function criarPts() {
  const pacienteId = await criarPaciente();
  const pts = await db.pts.create({
    data: { pacienteId, cerId: CER_ID, status: "REAVALIACAO" },
  });
  ptsIds.push(pts.id);
  return { ptsId: pts.id, pacienteId };
}

describe("triage/contrarreferencia — emitirContrarreferencia", () => {
  it("sem permissão recusa e não persiste", async () => {
    sessao.chaves = [];
    const pacienteId = await criarPaciente();
    const r = await emitirContrarreferencia({
      pacienteId,
      motivo: "Não elegível para o CER.",
    });
    expect(r.ok).toBe(false);
    expect(await db.contrarreferencia.count({ where: { pacienteId } })).toBe(0);
  });

  it("nem pacienteId nem ptsId → erro de validação", async () => {
    sessao.chaves = ["triage.contrarreferencia.emissao"];
    const r = await emitirContrarreferencia({ motivo: "Sem paciente nem pts." });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("pacienteId ou ptsId");
  });

  it("só pacienteId (NAO_ELEGIVEL sem PTS): cria guia com ptsId nulo, enfileira REFERRAL, audita same-tx", async () => {
    sessao.chaves = ["triage.contrarreferencia.emissao"];
    const pacienteId = await criarPaciente();

    const r = await emitirContrarreferencia({
      pacienteId,
      motivo: "CID fora do escopo do CER.",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    guiaIds.push(r.contrarreferenciaId);

    const guia = await db.contrarreferencia.findUniqueOrThrow({
      where: { id: r.contrarreferenciaId },
    });
    expect(guia.pacienteId).toBe(pacienteId);
    expect(guia.ptsId).toBeNull();
    expect(guia.emitidaPorId).toBe(adminId);

    const outbound = await db.outboundEvent.findFirstOrThrow({
      where: { tipo: "REFERRAL", payloadJson: { path: ["contrarreferenciaId"], equals: r.contrarreferenciaId } },
    });
    expect(outbound.status).toBe("PENDING");

    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "contrarreferencia", entityId: r.contrarreferenciaId },
    });
    expect(aud.action).toBe("contrarreferencia.emitir");
  });

  it("com ptsId: resolve pacienteId do PTS e grava plano de cuidados + destino", async () => {
    sessao.chaves = ["triage.contrarreferencia.emissao"];
    const { ptsId, pacienteId } = await criarPts();

    const r = await emitirContrarreferencia({
      ptsId,
      motivo: "Alta com encaminhamento à APS.",
      destinoUbs: "UBS Centro",
      planoCuidados: "Manter fisioterapia domiciliar 2x/semana.",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    guiaIds.push(r.contrarreferenciaId);

    const guia = await db.contrarreferencia.findUniqueOrThrow({
      where: { id: r.contrarreferenciaId },
    });
    expect(guia.pacienteId).toBe(pacienteId);
    expect(guia.ptsId).toBe(ptsId);
    expect(guia.destinoUbs).toBe("UBS Centro");
    expect(guia.planoCuidadosJson).toMatchObject({
      texto: "Manter fisioterapia domiciliar 2x/semana.",
    });
  });

  it("ptsId inexistente rejeita", async () => {
    sessao.chaves = ["triage.contrarreferencia.emissao"];
    const r = await emitirContrarreferencia({
      ptsId: randomUUID(),
      motivo: "x",
    });
    expect(r.ok).toBe(false);
  });
});

describe("triage/contrarreferencia — listagem e resumo", () => {
  it("listarContrarreferenciasPts retorna as guias do caso, mais recente primeiro", async () => {
    sessao.chaves = ["triage.contrarreferencia.emissao", "triage.triagem.ver"];
    const { ptsId } = await criarPts();

    const a = await emitirContrarreferencia({ ptsId, motivo: "Primeira guia." });
    const b = await emitirContrarreferencia({ ptsId, motivo: "Segunda guia." });
    if (a.ok) guiaIds.push(a.contrarreferenciaId);
    if (b.ok) guiaIds.push(b.contrarreferenciaId);

    const lista = await listarContrarreferenciasPts(ptsId);
    expect(lista.map((g) => g.motivo)).toEqual(["Segunda guia.", "Primeira guia."]);
  });

  it("sem triage.triagem.ver retorna lista vazia (não vaza dado)", async () => {
    sessao.chaves = ["triage.contrarreferencia.emissao"];
    const { ptsId } = await criarPts();
    const emitida = await emitirContrarreferencia({ ptsId, motivo: "Guia." });
    if (emitida.ok) guiaIds.push(emitida.contrarreferenciaId);

    sessao.chaves = [];
    expect(await listarContrarreferenciasPts(ptsId)).toEqual([]);
  });

  it("buscarContrarreferencia retorna o resumo por id; inexistente retorna null", async () => {
    sessao.chaves = ["triage.contrarreferencia.emissao"];
    const pacienteId = await criarPaciente();
    const r = await emitirContrarreferencia({
      pacienteId,
      motivo: "Guia avulsa.",
      destinoUbs: "UBS Norte",
    });
    if (r.ok) guiaIds.push(r.contrarreferenciaId);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const resumo = await buscarContrarreferencia(r.contrarreferenciaId);
    expect(resumo?.destinoUbs).toBe("UBS Norte");
    expect(resumo?.motivo).toBe("Guia avulsa.");

    expect(await buscarContrarreferencia(randomUUID())).toBeNull();
  });
});
