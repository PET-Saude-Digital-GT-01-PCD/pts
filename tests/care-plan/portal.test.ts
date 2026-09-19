import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({ recursos: [] as string[], userId: "" }));

vi.mock("@/server/iam/session", () => ({
  requireAuth: async () => ({ id: sessao.userId, papelId: "p1", cerId: null }),
  recursosDoUsuario: async () => sessao.recursos,
}));

import { db } from "@/lib/db";
import { buscarPortalCidadao } from "@/server/care-plan/portal";

const CER_ID = "00000000-0000-4000-8000-000000000001";

let fisioId: string;
let medicoId: string;
let toId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

async function criarPts(status: "EM_AVALIACAO" | "SEGUIMENTO" = "EM_AVALIACAO") {
  const paciente = await db.paciente.create({
    data: {
      cerId: CER_ID,
      nome: `Paciente Portal ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: CER_ID, status, refProfissionalId: fisioId },
  });
  ptsIds.push(pts.id);
  return { ptsId: pts.id, nome: paciente.nome };
}

async function criarMeta(
  ptsId: string,
  status: "NOVA" | "EM_ANDAMENTO" | "CONCLUIDA",
  prazo: string,
  descAcessivel: string,
) {
  await db.meta.create({
    data: {
      ptsId,
      donoId: fisioId,
      descTecnica: `técnica: flexão de ombro ${randomUUID().slice(0, 4)}`,
      descAcessivel,
      status,
      dataPactuacao: new Date("2026-01-01"),
      prazo: new Date(prazo),
      criteriosJson: {},
    },
  });
}

beforeAll(async () => {
  const [fisio, medico, to] = await Promise.all(
    ["fisio@pts.local", "medico@pts.local", "to@pts.local"].map((email) =>
      db.usuario.findUniqueOrThrow({ where: { email }, select: { id: true } }),
    ),
  );
  fisioId = fisio.id;
  medicoId = medico.id;
  toId = to.id;
});

beforeEach(() => {
  sessao.recursos = ["care-plan.meta.ler"];
  sessao.userId = fisioId;
});

afterAll(async () => {
  await db.meta.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.equipePts.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.$disconnect();
});

describe("care-plan/portal — buscarPortalCidadao", () => {
  it("monta nome, percurso pela etapa atual e metas em linguagem acessível", async () => {
    const { ptsId, nome } = await criarPts("SEGUIMENTO");
    await criarMeta(ptsId, "EM_ANDAMENTO", "2026-09-01", "Andar até a padaria");
    await criarMeta(ptsId, "NOVA", "2026-08-01", "Subir escada com apoio");

    const view = await buscarPortalCidadao(ptsId);

    expect(view.pacienteNome).toBe(nome);
    const atual = view.etapas.find((e) => e.situacao === "atual");
    expect(atual?.chave).toBe("SEGUIMENTO");
    expect(view.etapas.find((e) => e.chave === "EM_AVALIACAO")?.situacao).toBe("concluida");

    expect(view.metas.map((m) => m.descAcessivel)).toEqual([
      "Subir escada com apoio",
      "Andar até a padaria",
    ]);
    expect(view.metas.map((m) => m.statusLabel)).toEqual(["Combinada", "Em andamento"]);
    // nenhum campo técnico vaza para o portal
    expect(JSON.stringify(view)).not.toContain("técnica");
  });

  it("PTS sem metas devolve lista vazia", async () => {
    const { ptsId } = await criarPts();
    expect((await buscarPortalCidadao(ptsId)).metas).toEqual([]);
  });

  it("PTS inexistente → notFound", async () => {
    await expect(buscarPortalCidadao(randomUUID())).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("sem nenhuma das permissões de leitura do caso → redirect", async () => {
    const { ptsId } = await criarPts();
    sessao.recursos = [];
    await expect(buscarPortalCidadao(ptsId)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("membro da equipe (não referência) acessa", async () => {
    const { ptsId } = await criarPts();
    await db.equipePts.create({ data: { ptsId, usuarioId: medicoId, papelNoCaso: "Médico" } });
    sessao.userId = medicoId;
    await expect(buscarPortalCidadao(ptsId)).resolves.toMatchObject({ metas: [] });
  });

  it("profissional sem vínculo ao caso é redirecionado, como na página do caso (#69)", async () => {
    const { ptsId } = await criarPts();
    sessao.userId = toId;
    await expect(buscarPortalCidadao(ptsId)).rejects.toThrow("NEXT_REDIRECT");
  });
});
