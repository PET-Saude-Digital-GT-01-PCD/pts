import { describe, expect, it, vi, beforeAll, afterAll, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";

const sessao = vi.hoisted(() => ({ recursos: [] as string[], cerId: "" }));

vi.mock("@/server/iam/session", () => ({
  requireAuth: async () => ({ id: "gestor-teste", papelId: "p1", cerId: sessao.cerId }),
  recursosDoUsuario: async () => sessao.recursos,
}));

import { db } from "@/lib/db";
import { buscarIndicadores, exportarCsv } from "@/server/governance/relatorios";

// CER isolado: com o filtro por CER (#57, mesmo princípio do dashboard do
// gestor) os valores são exatos, sem depender do seed nem de outros testes.

const DIA = 86_400_000;
const agora = Date.now();
const haDias = (d: number) => new Date(agora - d * DIA);
const periodo = { desde: haDias(30), ate: new Date(agora + DIA) };

let cerId: string;
let cerVazioId: string;
let atorId: string;
const pacienteIds: string[] = [];
const ptsIds: string[] = [];

async function criarPts(
  cer: string,
  status: "SEGUIMENTO" | "EM_AVALIACAO" | "FECHADO",
  aberturaEm: Date,
) {
  const paciente = await db.paciente.create({
    data: {
      cerId: cer,
      nome: `Paciente Relatorio ${randomUUID().slice(0, 8)}`,
      dtnasc: new Date("1990-01-01"),
      sexo: "OUTRO",
    },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({
    data: { pacienteId: paciente.id, cerId: cer, status, aberturaEm },
  });
  ptsIds.push(pts.id);
  return { ptsId: pts.id, pacienteId: paciente.id };
}

async function meta(ptsId: string) {
  await db.meta.create({
    data: {
      ptsId,
      donoId: atorId,
      descTecnica: "t",
      descAcessivel: "a",
      criteriosJson: {},
      prazo: new Date(agora + 30 * DIA),
    },
  });
}

async function triagem(ptsId: string, comAjuste: boolean) {
  const t = await db.triagem.create({
    data: { ptsId, motivo: "m", eixosJson: {}, classificacao: "AMARELO" },
  });
  if (comAjuste) {
    await db.ajusteClassificacao.create({
      data: { triagemId: t.id, de: "AMARELO", para: "VERMELHO", motivo: "m", ajustadoPorId: atorId },
    });
  }
}

async function eventos(ptsId: string, tipo: "SESSAO" | "FALTA" | "OUTRO", n: number) {
  for (let i = 0; i < n; i++) {
    await db.eventoCuidado.create({
      data: { ptsId, tipo, data: haDias(1), registradoPorId: atorId },
    });
  }
}

function porId(indicadores: Awaited<ReturnType<typeof buscarIndicadores>>["indicadores"]) {
  return Object.fromEntries(indicadores.map((i) => [i.id, i]));
}

beforeAll(async () => {
  const admin = await db.usuario.findUniqueOrThrow({
    where: { email: "admin@pts.local" },
    select: { id: true },
  });
  atorId = admin.id;
  const [cer, vazio] = await Promise.all(
    ["Relatorio", "Relatorio Vazio"].map((n) =>
      db.cer.create({ data: { nome: `CER ${n} ${randomUUID().slice(0, 8)}`, municipio: "Teste" } }),
    ),
  );
  cerId = cer.id;
  cerVazioId = vazio.id;

  // A: ativo, recente, com meta, baseline, 1ª avaliação 2 dias após a abertura,
  //    3 sessões + 1 falta (+1 OUTRO, ignorado), triagem com ajuste manual.
  const a = await criarPts(cerId, "SEGUIMENTO", haDias(10));
  await meta(a.ptsId);
  await db.baseline.create({ data: { pacienteId: a.pacienteId } });
  await db.avaliacao.create({
    data: { ptsId: a.ptsId, especialidade: "SOAP", dadosJson: {}, avaliadorId: atorId, criadaEm: haDias(8) },
  });
  await eventos(a.ptsId, "SESSAO", 3);
  await eventos(a.ptsId, "FALTA", 1);
  await eventos(a.ptsId, "OUTRO", 1);
  await triagem(a.ptsId, true);

  // B: ativo, aberto há 200 dias sem revisão nem meta, sem baseline,
  //    triagem sem ajuste. Abertura fora do período → fora do tempo de 1ª avaliação.
  const b = await criarPts(cerId, "EM_AVALIACAO", haDias(200));
  await triagem(b.ptsId, false);

  // C: fechado — fica fora dos indicadores de PTS ativo.
  const c = await criarPts(cerId, "FECHADO", haDias(5));
  await meta(c.ptsId);
});

beforeEach(() => {
  sessao.recursos = ["governanca.relatorios.ver"];
  sessao.cerId = cerId;
});

afterAll(async () => {
  const triagens = await db.triagem.findMany({ where: { ptsId: { in: ptsIds } }, select: { id: true } });
  await db.ajusteClassificacao.deleteMany({ where: { triagemId: { in: triagens.map((t) => t.id) } } });
  await db.triagem.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.eventoCuidado.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.avaliacao.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.meta.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.baseline.deleteMany({ where: { pacienteId: { in: pacienteIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  await db.cer.deleteMany({ where: { id: { in: [cerId, cerVazioId] } } });
  await db.$disconnect();
});

describe("governance/relatorios — buscarIndicadores", () => {
  it("sem governanca.dashboard.ver nem relatorios.ver → redirect", async () => {
    sessao.recursos = ["clinical.soap.ler"];
    await expect(buscarIndicadores(periodo)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("governanca.dashboard.ver também dá acesso (OR)", async () => {
    sessao.recursos = ["governanca.dashboard.ver"];
    await expect(buscarIndicadores(periodo)).resolves.toBeDefined();
  });

  it("calcula cada indicador sobre o CER do usuário", async () => {
    const ind = porId((await buscarIndicadores(periodo)).indicadores);

    // A em dia com meta; B atrasado e sem meta; C fechado não conta
    expect(ind["north-star"]).toMatchObject({ valor: 50, disponivel: true });
    expect(ind["cobertura-baseline"]).toMatchObject({ valor: 50, disponivel: true });
    expect(ind["metas-por-pts"]).toMatchObject({ valor: 50, disponivel: true });
    // 3 sessões / (3 sessões + 1 falta); OUTRO não entra
    expect(ind["adesao"]).toMatchObject({ valor: 75, disponivel: true });
    // só A abriu no período: 1ª avaliação 2 dias depois
    expect(ind["tempo-primeira-avaliacao"]).toMatchObject({ valor: 2, disponivel: true });
    // 2 triagens no período, 1 com ajuste
    expect(ind["divergencia-manual"]).toMatchObject({ valor: 50, disponivel: true });
  });

  it("indicadores sem fonte de dado vêm indisponíveis, sem número inventado", async () => {
    const ind = porId((await buscarIndicadores(periodo)).indicadores);
    for (const id of ["tempo-recepcao", "pendencia-sync", "erro-integracao"]) {
      expect(ind[id]).toMatchObject({ valor: null, disponivel: false });
    }
  });

  it("CER sem dados: tudo indisponível — dados de outro CER não vazam", async () => {
    sessao.cerId = cerVazioId;
    const { indicadores } = await buscarIndicadores(periodo);
    expect(indicadores.every((i) => i.valor === null && !i.disponivel)).toBe(true);
  });

  it("período padrão quando não informado", async () => {
    const { periodo: p } = await buscarIndicadores();
    expect(p.ate.getTime()).toBeGreaterThan(p.desde.getTime());
  });
});

describe("governance/relatorios — exportarCsv", () => {
  it("cabeçalho fixo, uma linha por indicador, status e vazio para sem dado", async () => {
    const csv = await exportarCsv(periodo);
    const [cabecalho, ...linhas] = csv.split("\n");
    expect(cabecalho).toBe("indicador,valor,unidade,meta,status,fonte");
    expect(linhas).toHaveLength(9);
    expect(linhas).toContain("Adesão (sessões realizadas vs. faltas),75,%,70,OK,evento_cuidado");
    expect(linhas.find((l) => l.startsWith("Tempo de recepção"))).toMatch(/,,min,2,SEM_DADO,/);
  });

  it("escapa entre aspas só os campos com vírgula", async () => {
    const csv = await exportarCsv(periodo);
    expect(csv).toContain('PTS ativos com revisão em dia e ≥1 meta,50,%,100,ATENCAO,"pts, pts_revisao, meta"');
  });
});
