import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const permissoes = vi.hoisted(() => ({
  permitido: true,
  userId: "",
  cerId: "",
}));

vi.mock("@/server/iam/session", () => ({
  requirePermissao: async () => {
    if (!permissoes.permitido) throw new Error("sem permissão");
    return { id: permissoes.userId, cerId: permissoes.cerId };
  },
}));

import { db } from "@/lib/db";
import { emitirAcessoPortal, revogarAcessoPortal } from "@/server/portal/acoes";
import { validarCodigoParaEntrada } from "@/server/portal/sessao";
import { hashCodigo } from "@/server/portal/codigo";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let fisioId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

async function criarCaso() {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Acesso ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1980-05-05"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID, status: "SEGUIMENTO" },
  });
  ptsIds.push(pts.id);
  return { pacienteId: paciente.id, ptsId: pts.id };
}

async function criarPacienteSemCaso() {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Sem Caso ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1975-02-02"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  return paciente.id;
}

async function auditarPorPaciente(pacienteId: string, action: string) {
  return db.auditoria.findFirst({ where: { actorPacienteId: pacienteId, action } });
}

beforeAll(async () => {
  const fisio = await db.usuario.findUniqueOrThrow({
    where: { email: "fisio@pts.local" },
    select: { id: true },
  });
  fisioId = fisio.id;
});

beforeEach(() => {
  permissoes.permitido = true;
  permissoes.userId = fisioId;
  permissoes.cerId = CER_ID;
});

afterAll(async () => {
  await db.auditoria.deleteMany({ where: { actorPacienteId: { in: pacienteIds } } });
  await db.acessoCidadao.deleteMany({ where: { pacienteId: { in: pacienteIds } } });
  await db.equipePts.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

describe("portal/acesso — emissão pela equipe", () => {
  it("emite código, guarda só o hash e audita na transação", async () => {
    const { pacienteId, ptsId } = await criarCaso();

    const res = await emitirAcessoPortal(pacienteId);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.codigo).toHaveLength(10);
    expect(res.link).toContain(`/portal?acesso=${res.codigo}&pts=${ptsId}`);

    const acesso = await db.acessoCidadao.findFirstOrThrow({
      where: { pacienteId },
    });
    expect(acesso.tokenHash).toBe(hashCodigo(res.codigo));
    expect(acesso.revogadoEm).toBeNull();

    const aud = await db.auditoria.findFirstOrThrow({
      where: { action: "portal.acesso.emitir", entityId: pacienteId },
    });
    expect(aud.actorId).toBe(fisioId);
    expect(aud.actorTipo).toBe("USUARIO");
    expect(JSON.stringify(aud.afterJson)).not.toContain(res.codigo);
  });

  it("reemitir invalida o código anterior (1 credencial ativa por paciente)", async () => {
    const { pacienteId } = await criarCaso();
    const primeiro = await emitirAcessoPortal(pacienteId);
    if (!primeiro.ok) throw new Error("falha ao emitir");
    const segundo = await emitirAcessoPortal(pacienteId);
    if (!segundo.ok) throw new Error("falha ao emitir");

    expect((await validarCodigoParaEntrada(primeiro.codigo)).ok).toBe(false);
    expect((await validarCodigoParaEntrada(segundo.codigo)).ok).toBe(true);

    const antigo = await db.acessoCidadao.findUniqueOrThrow({
      where: { id: primeiro.acessoId },
    });
    expect(antigo.revogadoEm).not.toBeNull();
    expect(antigo.revogadoPorId).toBe(fisioId);

    const ativas = await db.acessoCidadao.count({
      where: { pacienteId, revogadoEm: null, validoAte: { gt: new Date() } },
    });
    expect(ativas).toBe(1);

    const aud = await db.auditoria.findFirst({
      where: { action: "portal.acesso.revogar", entityId: pacienteId },
    });
    expect(aud?.beforeJson).toMatchObject({
      acessoId: primeiro.acessoId,
      motivo: "substituido_por_nova_emissao",
    });
  });

  it("paciente de outro CER é recusado", async () => {
    const { pacienteId } = await criarCaso();
    permissoes.cerId = randomUUID();
    const res = await emitirAcessoPortal(pacienteId);
    expect(res.ok).toBe(false);
  });

  it("sem permissão lança (requirePermissao)", async () => {
    const { pacienteId } = await criarCaso();
    permissoes.permitido = false;
    await expect(emitirAcessoPortal(pacienteId)).rejects.toThrow("sem permissão");
  });
});

describe("portal/acesso — entrada do cidadão", () => {
  it("troca o código por sessão, resolve o PTS e audita como CIDADAO", async () => {
    const { pacienteId, ptsId } = await criarCaso();
    const emitido = await emitirAcessoPortal(pacienteId);
    if (!emitido.ok) throw new Error("falha ao emitir");

    const entrada = await validarCodigoParaEntrada(emitido.codigo, ptsId);
    expect(entrada).toMatchObject({ ok: true, ptsId, pacienteId });

    const aud = await auditarPorPaciente(pacienteId, "portal.acesso.entrar");
    expect(aud?.actorTipo).toBe("CIDADAO");
    expect(aud?.actorId).toBeNull();
    expect(aud?.entityType).toBe("paciente");

    const acesso = await db.acessoCidadao.findFirstOrThrow({ where: { pacienteId } });
    expect(acesso.usadoEm).not.toBeNull();
  });

  it("paciente ainda sem PTS entra (aguardando), sem erro de código", async () => {
    const pacienteId = await criarPacienteSemCaso();
    const emitido = await emitirAcessoPortal(pacienteId);
    if (!emitido.ok) throw new Error("falha ao emitir");
    expect(emitido.link).not.toContain("pts=");

    const entrada = await validarCodigoParaEntrada(emitido.codigo);
    expect(entrada).toMatchObject({ ok: true, ptsId: null, pacienteId });

    const aud = await auditarPorPaciente(pacienteId, "portal.acesso.entrar");
    expect(aud?.actorTipo).toBe("CIDADAO");
    expect(aud?.afterJson).toMatchObject({ ptsId: null });
  });

  it("aceita código com separadores/leitura aproximada", async () => {
    const { pacienteId } = await criarCaso();
    const emitido = await emitirAcessoPortal(pacienteId);
    if (!emitido.ok) throw new Error("falha ao emitir");

    const comSeparadores = emitido.codigo.toLowerCase().split("").join("-");
    const entrada = await validarCodigoParaEntrada(comSeparadores);
    expect(entrada.ok).toBe(true);
  });

  it("código errado é recusado sem auditoria", async () => {
    const { pacienteId } = await criarCaso();
    const entrada = await validarCodigoParaEntrada("7K3M9P2QR4");
    expect(entrada.ok).toBe(false);
    expect(await auditarPorPaciente(pacienteId, "portal.acesso.entrar")).toBeNull();
  });

  it("código revogado é recusado", async () => {
    const { pacienteId } = await criarCaso();
    const emitido = await emitirAcessoPortal(pacienteId);
    if (!emitido.ok) throw new Error("falha ao emitir");

    await revogarAcessoPortal(emitido.acessoId);
    const entrada = await validarCodigoParaEntrada(emitido.codigo);
    expect(entrada.ok).toBe(false);
  });

  it("código expirado é recusado", async () => {
    const { pacienteId } = await criarCaso();
    const codigo = "7K3M9P2QR4";
    await db.acessoCidadao.create({
      data: {
        pacienteId,
        tokenHash: hashCodigo(codigo),
        emitidoPorId: fisioId,
        validoAte: new Date(Date.now() - 1000),
      },
    });
    const entrada = await validarCodigoParaEntrada(codigo);
    expect(entrada.ok).toBe(false);
  });

  it("PTS sugerido de outro paciente cai para o mais recente do próprio", async () => {
    const { pacienteId } = await criarCaso();
    const outro = await criarCaso();
    const emitido = await emitirAcessoPortal(pacienteId);
    if (!emitido.ok) throw new Error("falha ao emitir");

    const entrada = await validarCodigoParaEntrada(emitido.codigo, outro.ptsId);
    expect(entrada).toMatchObject({ ok: true, pacienteId });
    if (entrada.ok) expect(entrada.ptsId).not.toBe(outro.ptsId);
  });
});

describe("portal/acesso — revogação", () => {
  it("revoga, audita com beforeJson e é idempotente", async () => {
    const { pacienteId } = await criarCaso();
    const emitido = await emitirAcessoPortal(pacienteId);
    if (!emitido.ok) throw new Error("falha ao emitir");

    expect(await revogarAcessoPortal(emitido.acessoId)).toEqual({ ok: true });

    const revogado = await db.acessoCidadao.findUniqueOrThrow({
      where: { id: emitido.acessoId },
    });
    expect(revogado.revogadoEm).not.toBeNull();
    expect(revogado.revogadoPorId).toBe(fisioId);

    const aud = await db.auditoria.findFirstOrThrow({
      where: { action: "portal.acesso.revogar", entityId: pacienteId },
    });
    expect(aud.actorTipo).toBe("USUARIO");
    expect(aud.beforeJson).toMatchObject({ acessoId: emitido.acessoId });

    // segunda chamada: idempotente, sem nova linha de auditoria
    expect(await revogarAcessoPortal(emitido.acessoId)).toEqual({ ok: true });
    const total = await db.auditoria.count({
      where: { action: "portal.acesso.revogar", entityId: pacienteId },
    });
    expect(total).toBe(1);
  });
});
