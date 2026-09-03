import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

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
import { criarPaciente } from "@/server/reception/paciente";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let adminId: string;
const pacienteIds: string[] = [];

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
  adminId = admin.id;
  sessao.actorId = adminId;
  sessao.cerId = CER_ID;

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
  await db.ppiLocal.deleteMany({
    where: { cerId: CER_ID, municipioOrigem: { in: ["Olinda", "Jaboatão Vencida"] } },
  });
  await db.$disconnect();
});

describe("reception/paciente — criarPaciente valida PPI por município (#65)", () => {
  it("município com PPI pactuada: cadastro normal, sem provisorio", async () => {
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
