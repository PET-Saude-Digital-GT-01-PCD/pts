import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({
  chaves: [] as string[],
  actorId: "",
  cerId: "",
}));

vi.mock("@/server/iam/session", () => ({
  requirePermissao: async (...chaves: string[]) => {
    if (!chaves.every((c) => sessao.chaves.includes(c))) {
      const { redirect } = await import("next/navigation");
      redirect("/");
    }
    return { id: sessao.actorId, cerId: sessao.cerId };
  },
}));

import { db } from "@/lib/db";
import {
  registrarConsentimento,
  revogarConsentimento,
} from "@/server/reception/consentimento";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let cerOutroId: string;
const pacienteIds: string[] = [];

async function criarPaciente(cerId = CER_ID) {
  const p = await db.paciente.create({
    data: {
      cerId,
      nome: `Paciente Consentimento ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(p.id);
  return p.id;
}

function auditoria(entityId: string) {
  return db.auditoria.findMany({ where: { entityType: "consentimento", entityId } });
}

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  sessao.actorId = admin.id;
  const outro = await db.cer.create({
    data: { nome: `CER Consent ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
  });
  cerOutroId = outro.id;
});

beforeEach(() => {
  sessao.chaves = ["recepcao.consentimento.registrar"];
  sessao.cerId = CER_ID;
});

afterAll(async () => {
  const consentimentos = await db.consentimento.findMany({
    where: { pacienteId: { in: pacienteIds } },
    select: { id: true },
  });
  await db.auditoria.deleteMany({
    where: { entityType: "consentimento", entityId: { in: consentimentos.map((c) => c.id) } },
  });
  await db.consentimento.deleteMany({ where: { pacienteId: { in: pacienteIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.cer.delete({ where: { id: cerOutroId } });
  await db.$disconnect();
});

describe("reception/consentimento — registrarConsentimento", () => {
  it("sem permissão recusa (redirect) e não grava", async () => {
    const pacienteId = await criarPaciente();
    sessao.chaves = [];
    await expect(
      registrarConsentimento({ pacienteId, termoVersao: "v1", canal: "TABLET" }),
    ).rejects.toThrow();
    expect(await db.consentimento.count({ where: { pacienteId } })).toBe(0);
  });

  it("registro válido grava consentimento e auditoria na mesma transação", async () => {
    const pacienteId = await criarPaciente();
    const r = await registrarConsentimento({
      pacienteId,
      termoVersao: "v1",
      canal: "WHATSAPP",
      assinaturaRef: "assin-123",
    });
    if (!r.ok) throw new Error(r.erro);

    const c = await db.consentimento.findUniqueOrThrow({ where: { id: r.consentimentoId } });
    expect(c).toMatchObject({ pacienteId, termoVersao: "v1", canal: "WHATSAPP", revogadoEm: null });

    const aud = await auditoria(r.consentimentoId);
    expect(aud).toHaveLength(1);
    expect(aud[0]).toMatchObject({ action: "consentimento.registrar", actorId: sessao.actorId });
    expect(aud[0].afterJson).toMatchObject({ pacienteId, termoVersao: "v1", canal: "WHATSAPP" });
  });

  it("input inválido (canal fora do enum) devolve erro sem gravar", async () => {
    const pacienteId = await criarPaciente();
    const r = await registrarConsentimento({ pacienteId, termoVersao: "v1", canal: "FAX" });
    expect(r.ok).toBe(false);
    expect(await db.consentimento.count({ where: { pacienteId } })).toBe(0);
  });

  it("paciente inexistente e paciente de outro CER são recusados", async () => {
    const inexistente = await registrarConsentimento({
      pacienteId: randomUUID(),
      termoVersao: "v1",
      canal: "TABLET",
    });
    expect(inexistente).toEqual({ ok: false, erro: "Paciente não encontrado." });

    const deFora = await criarPaciente(cerOutroId);
    const r = await registrarConsentimento({ pacienteId: deFora, termoVersao: "v1", canal: "TABLET" });
    expect(r).toEqual({ ok: false, erro: "Paciente fora do CER do usuário." });
    expect(await db.consentimento.count({ where: { pacienteId: deFora } })).toBe(0);
  });

  it("registro duplicado do mesmo termo ainda vigente é recusado", async () => {
    const pacienteId = await criarPaciente();
    const primeiro = await registrarConsentimento({ pacienteId, termoVersao: "v1", canal: "TABLET" });
    expect(primeiro.ok).toBe(true);

    const duplicado = await registrarConsentimento({ pacienteId, termoVersao: "v1", canal: "GOVBR" });
    expect(duplicado).toEqual({
      ok: false,
      erro: "Já existe consentimento vigente para este termo.",
    });
    expect(await db.consentimento.count({ where: { pacienteId } })).toBe(1);
  });

  it("nova versão do termo e reconsentimento após revogação são permitidos", async () => {
    const pacienteId = await criarPaciente();
    const v1 = await registrarConsentimento({ pacienteId, termoVersao: "v1", canal: "TABLET" });
    if (!v1.ok) throw new Error(v1.erro);

    const v2 = await registrarConsentimento({ pacienteId, termoVersao: "v2", canal: "TABLET" });
    expect(v2.ok).toBe(true);

    expect((await revogarConsentimento({ consentimentoId: v1.consentimentoId })).ok).toBe(true);
    const deNovo = await registrarConsentimento({ pacienteId, termoVersao: "v1", canal: "TABLET" });
    expect(deNovo.ok).toBe(true);
  });
});

describe("reception/consentimento — revogarConsentimento", () => {
  it("revogação é append-only: cria novo registro, original intacto, audita", async () => {
    const pacienteId = await criarPaciente();
    const reg = await registrarConsentimento({ pacienteId, termoVersao: "v1", canal: "TABLET" });
    if (!reg.ok) throw new Error(reg.erro);

    const rev = await revogarConsentimento({ consentimentoId: reg.consentimentoId });
    if (!rev.ok) throw new Error(rev.erro);
    expect(rev.consentimentoId).not.toBe(reg.consentimentoId);

    const original = await db.consentimento.findUniqueOrThrow({ where: { id: reg.consentimentoId } });
    expect(original.revogadoEm).toBeNull();
    const revogacao = await db.consentimento.findUniqueOrThrow({ where: { id: rev.consentimentoId } });
    expect(revogacao).toMatchObject({ pacienteId, termoVersao: "v1", canal: "TABLET" });
    expect(revogacao.revogadoEm).toBeInstanceOf(Date);

    const aud = await auditoria(rev.consentimentoId);
    expect(aud).toHaveLength(1);
    expect(aud[0].action).toBe("consentimento.revogar");
    expect(aud[0].beforeJson).toMatchObject({ consentimentoAnteriorId: reg.consentimentoId });
  });

  it("revogar sem ter registrado (id inexistente) é recusado", async () => {
    const r = await revogarConsentimento({ consentimentoId: randomUUID() });
    expect(r).toEqual({ ok: false, erro: "Consentimento não encontrado." });
  });

  it("revogar o próprio registro de revogação é recusado", async () => {
    const pacienteId = await criarPaciente();
    const reg = await registrarConsentimento({ pacienteId, termoVersao: "v1", canal: "TABLET" });
    if (!reg.ok) throw new Error(reg.erro);
    const rev = await revogarConsentimento({ consentimentoId: reg.consentimentoId });
    if (!rev.ok) throw new Error(rev.erro);

    const r = await revogarConsentimento({ consentimentoId: rev.consentimentoId });
    expect(r).toEqual({ ok: false, erro: "Consentimento já revogado." });
  });

  it("revogar duas vezes o mesmo consentimento é recusado na segunda", async () => {
    const pacienteId = await criarPaciente();
    const reg = await registrarConsentimento({ pacienteId, termoVersao: "v1", canal: "TABLET" });
    if (!reg.ok) throw new Error(reg.erro);

    expect((await revogarConsentimento({ consentimentoId: reg.consentimentoId })).ok).toBe(true);
    const segunda = await revogarConsentimento({ consentimentoId: reg.consentimentoId });
    expect(segunda).toEqual({ ok: false, erro: "Consentimento já revogado." });
    expect(await db.consentimento.count({ where: { pacienteId } })).toBe(2);
  });

  it("consentimento de paciente de outro CER não é revogado", async () => {
    const deFora = await criarPaciente(cerOutroId);
    const c = await db.consentimento.create({
      data: { pacienteId: deFora, termoVersao: "v1", canal: "TABLET" },
    });
    const r = await revogarConsentimento({ consentimentoId: c.id });
    expect(r).toEqual({ ok: false, erro: "Paciente fora do CER do usuário." });
  });
});
