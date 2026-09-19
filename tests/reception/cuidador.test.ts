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
import { registrarCuidador } from "@/server/reception/cuidador";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let cerOutroId: string;
let pacienteId: string;
let pacienteForaId: string;

const base = () => ({ pacienteId, nome: "Maria Cuidadora", parentesco: "Mãe" });

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  sessao.actorId = admin.id;
  const outro = await db.cer.create({
    data: { nome: `CER Cuidador ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
  });
  cerOutroId = outro.id;
  const [p, fora] = await Promise.all(
    [CER_ID, cerOutroId].map((cerId) =>
      db.paciente.create({
        data: {
          cerId,
          nome: `Paciente Cuidador ${randomUUID().slice(0, 8)}`,
          dtnasc: new Date("2015-01-01"),
          sexo: "OUTRO",
        },
      }),
    ),
  );
  pacienteId = p.id;
  pacienteForaId = fora.id;
});

beforeEach(() => {
  sessao.chaves = ["recepcao.paciente.cadastrar"];
  sessao.cerId = CER_ID;
});

afterAll(async () => {
  const ids = [pacienteId, pacienteForaId];
  const cuidadores = await db.cuidador.findMany({
    where: { pacienteId: { in: ids } },
    select: { id: true },
  });
  await db.auditoria.deleteMany({
    where: { entityType: "cuidador", entityId: { in: cuidadores.map((c) => c.id) } },
  });
  await db.cuidador.deleteMany({ where: { pacienteId: { in: ids } } });
  await db.paciente.deleteMany({ where: { id: { in: ids } } });
  await db.cer.delete({ where: { id: cerOutroId } });
  await db.$disconnect();
});

describe("reception/cuidador — registrarCuidador", () => {
  it("sem recepcao.paciente.cadastrar recusa (redirect)", async () => {
    sessao.chaves = [];
    await expect(registrarCuidador(base())).rejects.toThrow();
  });

  it("cadastro completo grava cuidador vinculado ao paciente e audita", async () => {
    const r = await registrarCuidador({
      ...base(),
      idade: 45,
      comorbidadesJson: { hipertensao: true },
      zaritScore: 8,
      vulnerabilidadesJson: { renda: "baixa" },
    });
    if (!r.ok) throw new Error(r.erro);
    expect(r.zaritAlto).toBe(false);

    const c = await db.cuidador.findUniqueOrThrow({ where: { id: r.cuidadorId } });
    expect(c).toMatchObject({
      pacienteId,
      nome: "Maria Cuidadora",
      parentesco: "Mãe",
      idade: 45,
      zaritScore: 8,
      comorbidadesJson: { hipertensao: true },
      vulnerabilidadesJson: { renda: "baixa" },
    });

    const aud = await db.auditoria.findMany({
      where: { entityType: "cuidador", entityId: r.cuidadorId },
    });
    expect(aud).toHaveLength(1);
    expect(aud[0]).toMatchObject({ action: "cuidador.criar", actorId: sessao.actorId });
    expect(aud[0].afterJson).toMatchObject({ pacienteId, zaritScore: 8 });
  });

  it("só os obrigatórios (nome, parentesco) basta; opcionais ficam nulos", async () => {
    const r = await registrarCuidador(base());
    if (!r.ok) throw new Error(r.erro);
    const c = await db.cuidador.findUniqueOrThrow({ where: { id: r.cuidadorId } });
    expect(c).toMatchObject({ idade: null, zaritScore: null, comorbidadesJson: null });
    expect(r.zaritAlto).toBe(false);
  });

  it("zarit ≥ 12 sinaliza sobrecarga alta (limite exato)", async () => {
    const onze = await registrarCuidador({ ...base(), zaritScore: 11 });
    const doze = await registrarCuidador({ ...base(), zaritScore: 12 });
    expect(onze.ok && onze.zaritAlto).toBe(false);
    expect(doze.ok && doze.zaritAlto).toBe(true);
  });

  it.each([
    ["nome curto", { nome: "Jo" }],
    ["parentesco curto", { parentesco: "M" }],
    ["idade negativa", { idade: -1 }],
    ["idade fracionária", { idade: 30.5 }],
    ["zarit acima de 24", { zaritScore: 25 }],
    ["pacienteId não-uuid", { pacienteId: "abc" }],
  ])("validação: %s é recusado sem gravar", async (_desc, over) => {
    const antes = await db.cuidador.count({ where: { pacienteId } });
    const r = await registrarCuidador({ ...base(), ...over });
    expect(r.ok).toBe(false);
    expect(await db.cuidador.count({ where: { pacienteId } })).toBe(antes);
  });

  it("paciente inexistente é recusado", async () => {
    const r = await registrarCuidador({ ...base(), pacienteId: randomUUID() });
    expect(r).toEqual({ ok: false, erro: "Paciente não encontrado." });
  });

  it("paciente de outro CER é recusado sem gravar", async () => {
    const r = await registrarCuidador({ ...base(), pacienteId: pacienteForaId });
    expect(r).toEqual({ ok: false, erro: "Paciente fora do CER do usuário." });
    expect(await db.cuidador.count({ where: { pacienteId: pacienteForaId } })).toBe(0);
  });
});
