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

const CER_ID = "00000000-0000-4000-8000-000000000001";

function gerarCpf(): string {
  const d = [...Array(9)].map(() => Math.floor(Math.random() * 10));
  const dv = (base: number[]): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += base[i] * (base.length + 1 - i);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return [...d, dv(d), dv([...d, dv(d)])].join("");
}

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

  await db.ppiLocal.upsert({
    where: { cerId_municipioOrigem: { cerId: CER_ID, municipioOrigem: "Recife" } },
    update: { pactuado: true, vigenciaAte: null },
    create: { cerId: CER_ID, municipioOrigem: "Recife", pactuado: true },
  });
  await db.ppiLocal.upsert({
    where: { cerId_municipioOrigem: { cerId: CER_ID, municipioOrigem: "Olinda" } },
    update: { pactuado: false, vigenciaAte: null },
    create: { cerId: CER_ID, municipioOrigem: "Olinda", pactuado: false },
  });
  await db.ppiLocal.upsert({
    where: {
      cerId_municipioOrigem: { cerId: CER_ID, municipioOrigem: "Jaboatão Vencida" },
    },
    update: { pactuado: true, vigenciaAte: new Date("2020-01-01") },
    create: {
      cerId: CER_ID,
      municipioOrigem: "Jaboatão Vencida",
      pactuado: true,
      vigenciaAte: new Date("2020-01-01"),
    },
  });
});

afterAll(async () => {
  await db.auditoria.deleteMany({
    where: { entityType: "paciente", entityId: { in: pacienteIds } },
  });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.cer.deleteMany({ where: { id: { in: [cerAId, cerBId] } } });
  await db.ppiLocal.deleteMany({
    where: { cerId: CER_ID, municipioOrigem: { in: ["Olinda", "Jaboatão Vencida"] } },
  });
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

describe("reception/paciente — criarPaciente valida PPI por município (#65)", () => {
  it("município com PPI pactuada: cadastro normal, sem provisorio", async () => {
    sessao.cerId = CER_ID;
    const cpf = gerarCpf();
    const r = await criarPaciente({
      nome: "Paciente Recife",
      cpf,
      dtnasc: "1990-01-01",
      sexo: "OUTRO",
      municipioOrigem: "Recife",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    pacienteIds.push(r.pacienteId);
    expect(r.provisorio).toBe(false);
    expect(r.prazoRegularizacao).toBeNull();

    const paciente = await db.paciente.findUniqueOrThrow({ where: { id: r.pacienteId } });
    expect(paciente.provisorio).toBe(false);
    expect(paciente.prazoRegularizacao).toBeNull();
  });

  it("município sem PPI pactuada: cadastro provisório com prazo de 15 dias", async () => {
    sessao.cerId = CER_ID;
    const cpf = gerarCpf();
    const antes = Date.now();
    const r = await criarPaciente({
      nome: "Paciente Olinda",
      cpf,
      dtnasc: "1990-01-01",
      sexo: "OUTRO",
      municipioOrigem: "Olinda",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    pacienteIds.push(r.pacienteId);
    expect(r.provisorio).toBe(true);
    expect(r.prazoRegularizacao).not.toBeNull();

    const dias = Math.round(
      (r.prazoRegularizacao!.getTime() - antes) / (24 * 60 * 60 * 1000),
    );
    expect(dias).toBe(15);

    const aud = await db.auditoria.findFirstOrThrow({
      where: { entityType: "paciente", entityId: r.pacienteId },
    });
    expect(aud.afterJson).toMatchObject({
      municipioOrigem: "Olinda",
      pactuadoPpi: false,
      provisorio: true,
    });
  });

  it("município sem nenhum registro de PPI: tratado como não pactuado (provisório)", async () => {
    sessao.cerId = CER_ID;
    const cpf = gerarCpf();
    const r = await criarPaciente({
      nome: "Paciente Sem PPI",
      cpf,
      dtnasc: "1990-01-01",
      sexo: "OUTRO",
      municipioOrigem: "Município Inexistente XYZ",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    pacienteIds.push(r.pacienteId);
    expect(r.provisorio).toBe(true);
  });

  it("PPI pactuada mas com vigência vencida: tratado como não pactuado", async () => {
    sessao.cerId = CER_ID;
    const cpf = gerarCpf();
    const r = await criarPaciente({
      nome: "Paciente Vigência Vencida",
      cpf,
      dtnasc: "1990-01-01",
      sexo: "OUTRO",
      municipioOrigem: "Jaboatão Vencida",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    pacienteIds.push(r.pacienteId);
    expect(r.provisorio).toBe(true);
  });

  it("sem município: rejeita antes de tocar o banco", async () => {
    sessao.cerId = CER_ID;
    const cpf = gerarCpf();
    const r = await criarPaciente({
      nome: "Paciente Sem Município",
      cpf,
      dtnasc: "1990-01-01",
      sexo: "OUTRO",
    });
    expect(r.ok).toBe(false);
    expect(await db.paciente.count({ where: { cpf } })).toBe(0);
  });
});
