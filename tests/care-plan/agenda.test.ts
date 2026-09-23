import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
  cerId: "00000000-0000-4000-8000-000000000001",
}));

vi.mock("@/server/iam/session", () => ({
  requireAuth: async () => ({
    id: sessao.actorId,
    nome: "Teste agenda",
    email: "agenda@pts.local",
    papelId: "papel-teste",
    basePapel: "CLINICO",
    nomePapel: "TESTE",
    status: "ATIVO",
    categoria: null,
    cerId: sessao.cerId,
  }),
  recursosDoUsuario: async () => sessao.chaves,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import {
  cancelarAtendimento,
  criarAgendamento as criarAgendamentoServidor,
  reagendarAtendimento,
  registrarResultadoAtendimento,
} from "@/server/care-plan/agenda";

const CER_ID = "00000000-0000-4000-8000-000000000001";
const RECEPCAO_RECURSOS = [
  "agenda.atendimentos.ver",
  "agenda.atendimentos.agendar",
  "agenda.atendimentos.gerenciar",
];

let recepcaoId: string;
let profissionalId: string;
let adminId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

beforeAll(async () => {
  const [recepcao, profissional, admin] = await Promise.all([
    db.usuario.findUniqueOrThrow({ where: { email: "recepcao@pts.local" }, select: { id: true } }),
    db.usuario.findUniqueOrThrow({ where: { email: "fisio@pts.local" }, select: { id: true } }),
    db.usuario.findUniqueOrThrow({ where: { email: "admin@pts.local" }, select: { id: true } }),
  ]);
  recepcaoId = recepcao.id;
  profissionalId = profissional.id;
  adminId = admin.id;
});

beforeEach(() => {
  sessao.cerId = CER_ID;
  sessao.actorId = recepcaoId;
  sessao.chaves = [...RECEPCAO_RECURSOS];
});

afterAll(async () => {
  const agendamentos = await db.agendamento.findMany({
    where: { ptsId: { in: ptsIds } },
    select: { id: true },
  });
  await db.auditoria.deleteMany({
    where: { entityType: "agendamento", entityId: { in: agendamentos.map((a) => a.id) } },
  });
  await db.agendamento.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.eventoCuidado.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

async function criarPts() {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Agenda ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: {
      pacienteId: paciente.id,
      cerId: CER_ID,
      status: "EM_AVALIACAO",
      refProfissionalId: profissionalId,
    },
  });
  ptsIds.push(pts.id);
  return pts.id;
}

async function criarAgendamentoDireto(ptsId: string, inicioEm: Date, fimEm?: Date) {
  return db.agendamento.create({
    data: {
      ptsId,
      profissionalId,
      criadoPorId: recepcaoId,
      inicioEm,
      fimEm: fimEm ?? new Date(inicioEm.getTime() + 30 * 60_000),
    },
  });
}

function horarioFuturo(dias = 2) {
  return new Date(Date.now() + dias * 24 * 60 * 60_000);
}

describe("care-plan/agenda — criarAgendamento", () => {
  it("cria e audita o agendamento; impede sobreposição do mesmo profissional", async () => {
    const ptsId = await criarPts();
    const outroPtsId = await criarPts();
    const inicioEm = horarioFuturo();

    const criado = await criarAgendamentoAction(ptsId, inicioEm);
    expect(criado.ok).toBe(true);
    if (!criado.ok || !criado.agendamentoId) return;

    const salvo = await db.agendamento.findUniqueOrThrow({ where: { id: criado.agendamentoId } });
    expect(salvo).toMatchObject({ ptsId, profissionalId, status: "AGENDADO" });
    const auditoria = await db.auditoria.findFirstOrThrow({
      where: { entityType: "agendamento", entityId: salvo.id, action: "agenda.agendamento.criar" },
    });
    expect(auditoria.actorId).toBe(recepcaoId);

    const conflito = await criarAgendamentoAction(outroPtsId, new Date(inicioEm.getTime() + 15 * 60_000));
    expect(conflito).toEqual({ ok: false, erro: "Este profissional já tem um atendimento nesse horário." });
  });

  it("recusa sem permissão de agendar", async () => {
    sessao.chaves = ["agenda.atendimentos.ver"];
    const ptsId = await criarPts();
    const resultado = await criarAgendamentoAction(ptsId, horarioFuturo());
    expect(resultado).toEqual({ ok: false, erro: "Seu papel não permite agendar atendimentos." });
    expect(await db.agendamento.count({ where: { ptsId } })).toBe(0);
  });
});

async function criarAgendamentoAction(ptsId: string, inicioEm: Date) {
  return criarAgendamentoServidor({
    ptsId,
    profissionalId,
    inicioEm: inicioEm.toISOString(),
    duracaoMinutos: 30,
  });
}

describe("care-plan/agenda — reagendarAtendimento", () => {
  it("preserva o horário anterior e audita o novo agendamento", async () => {
    const ptsId = await criarPts();
    const anterior = await criarAgendamentoDireto(ptsId, horarioFuturo());
    const novoInicio = horarioFuturo(4);

    const resultado = await reagendarAtendimento({
      agendamentoId: anterior.id,
      inicioEm: novoInicio.toISOString(),
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok || !resultado.agendamentoId) return;

    const [antes, depois] = await Promise.all([
      db.agendamento.findUniqueOrThrow({ where: { id: anterior.id } }),
      db.agendamento.findUniqueOrThrow({ where: { id: resultado.agendamentoId } }),
    ]);
    expect(antes.status).toBe("REMARCADO");
    expect(depois).toMatchObject({ status: "AGENDADO", remarcadoDeId: anterior.id, inicioEm: novoInicio });
    expect(await db.auditoria.findFirst({
      where: { entityType: "agendamento", entityId: depois.id, action: "agenda.agendamento.remarcar" },
    })).not.toBeNull();
  });
});

describe("care-plan/agenda — cancelarAtendimento", () => {
  it("registra o cancelamento no percurso do PTS e na auditoria", async () => {
    const ptsId = await criarPts();
    const agendamento = await criarAgendamentoDireto(ptsId, horarioFuturo());

    const resultado = await cancelarAtendimento({ agendamentoId: agendamento.id, motivo: "Paciente solicitou." });
    expect(resultado).toEqual({ ok: true, agendamentoId: agendamento.id });

    const salvo = await db.agendamento.findUniqueOrThrow({
      where: { id: agendamento.id },
      include: { eventoCuidado: true },
    });
    expect(salvo.status).toBe("CANCELADO");
    expect(salvo.eventoCuidado).toMatchObject({ ptsId, tipo: "CANCELAMENTO" });
    expect(await db.auditoria.findFirst({
      where: { entityType: "agendamento", entityId: agendamento.id, action: "agenda.agendamento.cancelar" },
    })).not.toBeNull();
  });
});

describe("care-plan/agenda — registrarResultadoAtendimento", () => {
  it("permite ao profissional agendado registrar realização e falta após o atendimento", async () => {
    const ptsId = await criarPts();
    const realizado = await criarAgendamentoDireto(ptsId, new Date(Date.now() - 90 * 60_000), new Date(Date.now() - 60 * 60_000));
    const falta = await criarAgendamentoDireto(ptsId, new Date(Date.now() - 3 * 60 * 60_000), new Date(Date.now() - 150 * 60_000));
    sessao.actorId = profissionalId;
    sessao.chaves = ["agenda.atendimentos.ver", "agenda.atendimentos.registrar"];

    expect(await registrarResultadoAtendimento({ agendamentoId: realizado.id, resultado: "REALIZADO" })).toMatchObject({ ok: true });
    expect(await registrarResultadoAtendimento({ agendamentoId: falta.id, resultado: "FALTA" })).toMatchObject({ ok: true });

    const [sessaoGravada, faltaGravada] = await Promise.all([
      db.agendamento.findUniqueOrThrow({ where: { id: realizado.id }, include: { eventoCuidado: true } }),
      db.agendamento.findUniqueOrThrow({ where: { id: falta.id }, include: { eventoCuidado: true } }),
    ]);
    expect(sessaoGravada).toMatchObject({ status: "REALIZADO", eventoCuidado: { ptsId, tipo: "SESSAO" } });
    expect(faltaGravada).toMatchObject({ status: "FALTA", eventoCuidado: { ptsId, tipo: "FALTA" } });
  });

  it("não permite registrar o resultado antes do horário ou por outro usuário", async () => {
    const ptsId = await criarPts();
    const futuro = await criarAgendamentoDireto(ptsId, horarioFuturo());
    sessao.actorId = profissionalId;
    sessao.chaves = ["agenda.atendimentos.registrar"];
    const cedo = await registrarResultadoAtendimento({ agendamentoId: futuro.id, resultado: "REALIZADO" });
    expect(cedo).toMatchObject({ ok: false, erro: "O resultado só pode ser registrado após o horário do atendimento." });

    const passado = await criarAgendamentoDireto(ptsId, new Date(Date.now() - 60 * 60_000), new Date(Date.now() - 30 * 60_000));
    sessao.actorId = adminId;
    const outroUsuario = await registrarResultadoAtendimento({ agendamentoId: passado.id, resultado: "REALIZADO" });
    expect(outroUsuario).toMatchObject({ ok: false, erro: "Somente o profissional agendado pode registrar o resultado." });
  });
});
