import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({ cerId: "", actorId: "" }));

vi.mock("@/server/iam/session", () => ({
  requirePermissao: async () => ({
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
}));

import { db } from "@/lib/db";
import { buscarPacientePorDocumento, criarPaciente } from "@/server/reception/paciente";

let cerAId: string;
let cerBId: string;
const pacienteIds: string[] = [];

// CPFs de teste válidos (não usados no seed nem em outros arquivos de teste).
const CPF_A = "98765432100";
const CPF_B = "52998224725";

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  sessao.actorId = admin.id;

  const [cerA, cerB] = await Promise.all([
    db.cer.create({ data: { nome: `CER Pac A ${randomUUID().slice(0, 8)}`, municipio: "Teste" } }),
    db.cer.create({ data: { nome: `CER Pac B ${randomUUID().slice(0, 8)}`, municipio: "Teste" } }),
  ]);
  cerAId = cerA.id;
  cerBId = cerB.id;

  const pacienteB = await db.paciente.create({
    data: {
      cerId: cerBId,
      nome: "Paciente Só do CER B",
      cpf: CPF_B,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(pacienteB.id);
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "paciente", entityId: { in: pacienteIds } },
  });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.cer.deleteMany({ where: { id: { in: [cerAId, cerBId] } } });
  await db.$disconnect();
});

describe("reception/paciente — escopo de CER", () => {
  it("buscarPacientePorDocumento não vaza paciente de outro CER", async () => {
    sessao.cerId = cerAId;
    const encontrado = await buscarPacientePorDocumento(CPF_B);
    expect(encontrado).toBeNull();
  });

  it("buscarPacientePorDocumento encontra paciente do próprio CER", async () => {
    sessao.cerId = cerBId;
    const encontrado = await buscarPacientePorDocumento(CPF_B);
    expect(encontrado?.nome).toBe("Paciente Só do CER B");
  });

  it("criarPaciente com CPF já cadastrado em OUTRO CER não vaza o nome (erro genérico)", async () => {
    sessao.cerId = cerAId;
    const r = await criarPaciente({
      nome: "Tentativa CER A",
      cpf: CPF_B,
      dtnasc: "1991-02-02",
      sexo: "OUTRO",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).not.toContain("Paciente Só do CER B");
    expect(r.erro).toBe("Documento já cadastrado.");

    // não deve ter criado paciente novo no CER A com esse CPF
    const noCerA = await db.paciente.findFirst({ where: { cerId: cerAId, cpf: CPF_B } });
    expect(noCerA).toBeNull();
  });

  it("criarPaciente com CPF já cadastrado no MESMO CER avisa com o nome (duplicidade real)", async () => {
    sessao.cerId = cerBId;
    const r = await criarPaciente({
      nome: "Tentativa CER B",
      cpf: CPF_B,
      dtnasc: "1991-02-02",
      sexo: "OUTRO",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erro).toContain("Paciente Só do CER B");
  });

  it("criarPaciente com CPF novo no CER A cadastra normalmente", async () => {
    sessao.cerId = cerAId;
    const r = await criarPaciente({
      nome: "Paciente Novo CER A",
      cpf: CPF_A,
      dtnasc: "1992-03-03",
      sexo: "OUTRO",
    });
    expect(r.ok).toBe(true);
    if (r.ok) pacienteIds.push(r.pacienteId);
  });
});
