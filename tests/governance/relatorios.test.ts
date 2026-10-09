import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import type { SessaoUsuario } from "@/server/iam/session";

const sessao = vi.hoisted(() => ({ usuario: null as SessaoUsuario | null, atorRealId: null as string | null, impersonando: false }));
vi.mock("@/server/iam/session", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/iam/session")>(),
  getAtorReal: async () => ({ atorRealId: sessao.atorRealId ?? sessao.usuario!.id,
    impersonando: sessao.impersonando, usuarioSimuladoId: sessao.impersonando ? sessao.usuario!.id : null }),
  requireAuth: async () => {
    if (!sessao.usuario) throw new Error("NEXT_REDIRECT");
    return sessao.usuario;
  },
}));
import { db } from "@/lib/db";
import { buscarIndicadores, exportarCsv } from "@/server/governance/relatorios";
import { paraCsv } from "@/server/governance/indicadores";

const DIA = 86_400_000;
const agora = new Date();
const haDias = (d: number) => new Date(agora.getTime() - d * DIA);
const civil = (data: Date) => new Date(data.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
const periodo = { desde: civil(haDias(30)), ate: civil(agora) };
const ptsIds: string[] = [];
const pacienteIds: string[] = [];
let cerId: string, cerVazioId: string, papelId: string, papelDashboardId: string, papelVazioId: string;
let atorId: string, outroAtorId: string, adminRealId: string, ptsA: string, ptsB: string;
let relatorioRecursoId: string;
let usuarioBase: SessaoUsuario;
const identificadorPaciente = "PacienteConfidencial_" + randomUUID();

async function criarPts(cer: string, status: "SEGUIMENTO" | "EM_AVALIACAO" | "FECHADO", aberturaEm: Date) {
  const paciente = await db.paciente.create({
    data: { cerId: cer, nome: identificadorPaciente, dtnasc: new Date("1990-01-01"), sexo: "OUTRO" },
  });
  pacienteIds.push(paciente.id);
  const pts = await db.pts.create({ data: { pacienteId: paciente.id, cerId: cer, status, aberturaEm } });
  ptsIds.push(pts.id);
  return { ptsId: pts.id, pacienteId: paciente.id };
}
async function meta(ptsId: string) {
  return db.meta.create({
    data: { ptsId, donoId: atorId, descTecnica: "Descrição clínica confidencial", descAcessivel: "a", criteriosJson: {}, prazo: haDias(-30) },
  });
}
async function evento(ptsId: string, tipo: "SESSAO" | "FALTA" | "OUTRO", data = haDias(1)) {
  return db.eventoCuidado.create({ data: { ptsId, tipo, data, registradoPorId: atorId } });
}
async function triagem(ptsId: string, comAjuste: boolean, criadaEm = haDias(1)) {
  const t = await db.triagem.create({
    data: { ptsId, motivo: "m", eixosJson: {}, classificacao: "AMARELO", criadaEm },
  });
  if (comAjuste) {
    await db.ajusteClassificacao.create({
      data: { triagemId: t.id, de: "AMARELO", para: "VERMELHO", motivo: "m", ajustadoPorId: atorId },
    });
  }
}
function porId(painel: Awaited<ReturnType<typeof buscarIndicadores>>) {
  return Object.fromEntries(painel.indicadores.map((i) => [i.id, i]));
}

beforeAll(async () => {
  // Fixtures próprias: nenhum usuário/papel do seed é alterado.
  // Auditoria é append-only: CER/papel/atores referenciados pelos exports
  // permanecem no banco de teste; dados clínicos são removidos após a suíte.
  process.env.AUTH_SECRET ??= "governance-local-test-secret-not-production";
  const [cer, vazio] = await Promise.all(
    ["Relatorio", "Relatorio Vazio"].map((nome) => db.cer.create({
      data: { nome: "CER " + nome + " " + randomUUID(), municipio: "Teste" },
    })),
  );
  cerId = cer.id; cerVazioId = vazio.id;
  const recursos = await db.recurso.findMany({
    where: { chave: { in: ["governanca.dashboard.ver", "governanca.relatorios.ver"] } },
  });
  expect(recursos).toHaveLength(2);
  relatorioRecursoId = recursos.find((r) => r.chave === "governanca.relatorios.ver")!.id;
  const papel = await db.papel.create({
    data: { cerId, nome: "Gestor de teste " + randomUUID(), base: "GESTOR",
      recursos: { create: recursos.map((r) => ({ recursoId: r.id })) } },
  });
  const papelDashboard = await db.papel.create({
    data: { cerId, nome: "Dashboard de teste " + randomUUID(), base: "GESTOR",
      recursos: { create: [{ recursoId: recursos.find((r) => r.chave === "governanca.dashboard.ver")!.id }] } },
  });
  const papelVazio = await db.papel.create({ data: { cerId: cerVazioId, nome: "Gestor vazio", base: "GESTOR",
    recursos: { create: recursos.map((r) => ({ recursoId: r.id })) } } });
  papelId = papel.id; papelDashboardId = papelDashboard.id; papelVazioId = papelVazio.id;
  const atores = await Promise.all(["principal", "outro"].map((nome) => db.usuario.create({
    data: { cerId, papelId, email: nome + "-" + randomUUID() + "@governance.test",
      nome: "Gestor teste", senhaHash: "sem-login", categoria: "ENFERMEIRO", status: "ATIVO" },
  })));
  atorId = atores[0]!.id; outroAtorId = atores[1]!.id;
  const papelAdmin = await db.papel.create({ data: { cerId, nome: "Admin real " + randomUUID(), base: "ADMIN",
    recursos: { create: recursos.map((r) => ({ recursoId: r.id })) } } });
  const adminReal = await db.usuario.create({ data: { cerId, papelId: papelAdmin.id, email: randomUUID() + "@governance.test",
    nome: "Admin real teste", senhaHash: "sem-login", categoria: "ENFERMEIRO", status: "ATIVO" } });
  adminRealId = adminReal.id;
  usuarioBase = { id: atorId, cerId, papelId, nome: "Gestor teste", email: atores[0]!.email,
    basePapel: "GESTOR", nomePapel: papel.nome, status: "ATIVO", categoria: "ENFERMEIRO" };
  const a = await criarPts(cerId, "SEGUIMENTO", haDias(10));
  ptsA = a.ptsId;
  await meta(ptsA);
  await db.baseline.create({ data: { pacienteId: a.pacienteId } });
  await db.avaliacao.create({
    data: { ptsId: ptsA, especialidade: "SOAP", dadosJson: {}, avaliadorId: atorId, criadaEm: haDias(8) },
  });
  for (let i = 0; i < 3; i++) await evento(ptsA, "SESSAO");
  await evento(ptsA, "FALTA"); await evento(ptsA, "OUTRO"); await triagem(ptsA, true);
  const b = await criarPts(cerId, "EM_AVALIACAO", haDias(200));
  ptsB = b.ptsId; await meta(ptsB); await triagem(ptsB, false);
  const c = await criarPts(cerId, "FECHADO", haDias(5));
  await meta(c.ptsId);
});
beforeEach(() => {
  vi.useRealTimers(); sessao.usuario = { ...usuarioBase }; sessao.atorRealId = null; sessao.impersonando = false;
});
afterAll(async () => {
  vi.useRealTimers(); vi.restoreAllMocks();
  const triagens = await db.triagem.findMany({ where: { ptsId: { in: ptsIds } }, select: { id: true } });
  await db.ajusteClassificacao.deleteMany({ where: { triagemId: { in: triagens.map((t) => t.id) } } });
  await db.triagem.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.eventoCuidado.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.avaliacao.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.meta.deleteMany({ where: { ptsId: { in: ptsIds } } });
  await db.pts.deleteMany({ where: { id: { in: ptsIds } } });
  await db.baseline.deleteMany({ where: { pacienteId: { in: pacienteIds } } });
  await db.paciente.deleteMany({ where: { id: { in: pacienteIds } } });
  // CER vazio e seu papel também são fixtures de autorização mantidas.
});

describe("relatórios — agregação e período", () => {
  it("documenta snapshot, CER, período aplicado, fórmulas e nove indicadores", async () => {
    const painel = await buscarIndicadores(periodo);
    expect(painel).toMatchObject({ periodo, cadenciaRevisaoDias: 90, cer: { id: cerId }, podeExportar: true });
    expect(painel.snapshotId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(Number.isNaN(Date.parse(painel.geradoEm))).toBe(false);
    expect(painel.indicadores).toHaveLength(9);
    const ind = porId(painel);
    for (const id of ["north-star", "cobertura-baseline", "metas-por-pts"]) {
      expect(ind[id].escopoTemporal).toBe("ATUAL");
    }
    for (const id of ["adesao", "tempo-primeira-avaliacao", "divergencia-manual"]) {
      expect(ind[id].escopoTemporal).toBe("PERIODO");
    }
    for (const indicador of painel.indicadores) {
      expect(indicador.formula.length).toBeGreaterThan(0);
      expect(indicador.descricaoTemporal.length).toBeGreaterThan(0);
    }
    expect(ind["north-star"]).toMatchObject({ valor: 50, disponivel: true });
    expect(ind["cobertura-baseline"]).toMatchObject({ valor: 50, disponivel: true });
    expect(ind["metas-por-pts"]).toMatchObject({ valor: 100, disponivel: true });
    expect(ind["adesao"]).toMatchObject({ valor: 75, disponivel: true });
    expect(ind["tempo-primeira-avaliacao"]).toMatchObject({ valor: 2, disponivel: true });
    expect(ind["divergencia-manual"]).toMatchObject({ valor: 50, disponivel: true });
  });
  it("fontes não instrumentadas permanecem indisponíveis sem número inventado", async () => {
    const ind = porId(await buscarIndicadores(periodo));
    for (const id of ["tempo-recepcao", "pendencia-sync", "erro-integracao"]) {
      expect(ind[id]).toMatchObject({ valor: null, disponivel: false, escopoTemporal: "INDISPONIVEL" });
    }
  });
  it("cadência selecionada altera a revisão e é devolvida no snapshot", async () => {
    const curto = await buscarIndicadores({ ...periodo, cadenciaRevisaoDias: 1 });
    const longo = await buscarIndicadores({ ...periodo, cadenciaRevisaoDias: 365 });
    expect(porId(curto)["north-star"].valor).toBe(0);
    expect(porId(longo)["north-star"].valor).toBe(100);
    expect(longo.cadenciaRevisaoDias).toBe(365);
  });
  it("período histórico não muda KPIs de estado atual", async () => {
    const ind = porId(await buscarIndicadores({ desde: "2000-01-01", ate: "2000-01-31" }));
    expect(ind["north-star"].valor).toBe(50);
    expect(ind["metas-por-pts"].valor).toBe(100);
    expect(ind["adesao"]).toMatchObject({ valor: null, disponivel: false });
  });
  it("inclui o primeiro e o último milissegundo do dia civil, exclui os vizinhos", async () => {
    await evento(ptsA, "SESSAO", new Date("2024-02-29T03:00:00.000Z"));
    await evento(ptsA, "SESSAO", new Date("2024-03-01T02:59:59.999Z"));
    await evento(ptsA, "FALTA", new Date("2024-02-29T02:59:59.999Z"));
    await evento(ptsA, "FALTA", new Date("2024-03-01T03:00:00.000Z"));
    await triagem(ptsA, true, new Date("2024-02-29T03:00:00.000Z"));
    await triagem(ptsA, true, new Date("2024-03-01T02:59:59.999Z"));
    await triagem(ptsA, false, new Date("2024-02-29T02:59:59.999Z"));
    await triagem(ptsA, false, new Date("2024-03-01T03:00:00.000Z"));
    const ind = porId(await buscarIndicadores({ desde: "2024-02-29", ate: "2024-02-29" }));
    expect(ind["adesao"].valor).toBe(100);
    expect(ind["divergencia-manual"].valor).toBe(100);
  });
  it("coorte de primeira avaliação respeita os dois limites e conta avaliação posterior ao período", async () => {
    const casos = [
      ["2024-02-29T03:00:00.000Z", 1],
      ["2024-03-01T02:59:59.999Z", 3],
      ["2024-02-29T02:59:59.999Z", 10],
      ["2024-03-01T03:00:00.000Z", 10],
    ] as const;
    for (const [data, dias] of casos) {
      const aberturaEm = new Date(data);
      const caso = await criarPts(cerId, "FECHADO", aberturaEm);
      await db.avaliacao.create({ data: { ptsId: caso.ptsId, especialidade: "SOAP", dadosJson: {},
        avaliadorId: atorId, criadaEm: new Date(aberturaEm.getTime() + dias * DIA) } });
    }
    const ind = porId(await buscarIndicadores({ desde: "2024-02-29", ate: "2024-02-29" }));
    expect(ind["tempo-primeira-avaliacao"].valor).toBe(2);
  });
  it("dados de outro CER não vazam para CER vazio", async () => {
    await db.usuario.update({ where: { id: atorId }, data: { cerId: cerVazioId, papelId: papelVazioId } });
    sessao.usuario!.cerId = cerVazioId;
    try {
      const painel = await buscarIndicadores(periodo);
      expect(painel.cer.id).toBe(cerVazioId);
      expect(painel.indicadores.every((i) => i.valor === null && !i.disponivel)).toBe(true);
    } finally { await db.usuario.update({ where: { id: atorId }, data: { cerId, papelId } }); }
  });
});

describe("relatórios — autorização revalidada e exportação", () => {
  it("sem permissão de governança nega leitura", async () => {
    await db.papelRecurso.deleteMany({ where: { papelId } });
    try { await expect(buscarIndicadores(periodo)).rejects.toThrow(); }
    finally {
      const recursos = await db.recurso.findMany({ where: { chave: { in: ["governanca.dashboard.ver", "governanca.relatorios.ver"] } } });
      await db.papelRecurso.createMany({ data: recursos.map((r) => ({ papelId, recursoId: r.id })) });
    }
  });
  it("permissão de dashboard permite ler e proíbe exportar", async () => {
    const antes = await buscarIndicadores(periodo);
    await db.usuario.update({ where: { id: atorId }, data: { papelId: papelDashboardId } });
    // Sessão mantém papel antigo: a autorização deve reler o banco.
    try {
      const painel = await buscarIndicadores(periodo);
      expect(painel.podeExportar).toBe(false);
      await expect(exportarCsv(antes.tokenExportacao)).rejects.toThrow();
    } finally { await db.usuario.update({ where: { id: atorId }, data: { papelId } }); }
  });
  it("CER da sessão obsoleta é substituído pelo escopo atual do banco", async () => {
    sessao.usuario!.cerId = null;
    expect((await buscarIndicadores(periodo)).cer.id).toBe(cerId);
  });
  it("CSV é exatamente o snapshot exibido mesmo após alteração do banco", async () => {
    const painel = await buscarIndicadores({ ...periodo, cadenciaRevisaoDias: 30 });
    const novo = await evento(ptsA, "FALTA");
    try {
      const arquivo = await exportarCsv(painel.tokenExportacao);
      expect(arquivo.conteudo).toBe(paraCsv(painel));
      expect(arquivo.tipoConteudo).toMatch(/text\/csv/);
      expect(arquivo.nomeArquivo).toContain(periodo.desde);
      expect(arquivo.nomeArquivo).toContain(periodo.ate);
      expect(porId(await buscarIndicadores(periodo))["adesao"].valor).toBe(60);
    } finally { await db.eventoCuidado.delete({ where: { id: novo.id } }); }
  });
  it("exportação auditada contém metadados e nenhum dado clínico individual", async () => {
    const painel = await buscarIndicadores(periodo);
    const antes = await db.auditoria.count({ where: { actorId: atorId } });
    const arquivo = await exportarCsv(painel.tokenExportacao);
    const auditorias = await db.auditoria.findMany({ where: { actorId: atorId }, orderBy: { criadaEm: "desc" } });
    expect(auditorias).toHaveLength(antes + 1);
    const registro = auditorias.find((a) => a.entityId === painel.snapshotId);
    expect(registro).toBeDefined();
    expect(registro).toMatchObject({ actorId: atorId, action: "governanca.relatorios.exportar", entityType: "relatorio_governanca" });
    expect(registro!.afterJson).toMatchObject({ cerId, periodo, fusoHorario: "America/Fortaleza", cadenciaRevisaoDias: 90,
      sha256: createHash("sha256").update(arquivo.conteudo, "utf8").digest("hex") });
    const payload = Buffer.from(painel.tokenExportacao.split(".")[0], "base64url").toString("utf8");
    const visivel = arquivo.conteudo + JSON.stringify(painel.indicadores) + JSON.stringify(registro!.afterJson) + payload;
    expect(visivel).not.toContain(identificadorPaciente);
    expect(visivel).not.toContain("Descrição clínica confidencial");
    for (const id of pacienteIds) expect(visivel).not.toContain(id);
    for (const id of ptsIds) expect(visivel).not.toContain(id);
  });
  it("token adulterado ou malformado não exporta nem grava auditoria", async () => {
    const painel = await buscarIndicadores(periodo);
    const antes = await db.auditoria.count({ where: { actorId: atorId } });
    const token = painel.tokenExportacao;
    for (const invalido of ["", "x", token.slice(1), (token[0] === "A" ? "B" : "A") + token.slice(1)]) {
      await expect(exportarCsv(invalido)).rejects.toThrow();
    }
    expect(await db.auditoria.count({ where: { actorId: atorId } })).toBe(antes);
  });
  it("token expirado após 24 horas é negado", async () => {
    const painel = await buscarIndicadores(periodo);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(Date.parse(painel.geradoEm) + DIA + 1));
    try { await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow(); }
    finally { vi.useRealTimers(); }
  });
  it("token de outro ator no mesmo CER é negado", async () => {
    const painel = await buscarIndicadores(periodo);
    sessao.usuario!.id = outroAtorId;
    await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow();
  });
  it("token não acompanha o ator para outro CER", async () => {
    const painel = await buscarIndicadores(periodo);
    await db.usuario.update({ where: { id: atorId }, data: { cerId: cerVazioId } });
    try { await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow(); }
    finally { await db.usuario.update({ where: { id: atorId }, data: { cerId } }); }
  });
  it("permissão revogada entre tela e exportação é negada com sessão antiga", async () => {
    const painel = await buscarIndicadores(periodo);
    await db.papelRecurso.delete({ where: { papelId_recursoId: { papelId, recursoId: relatorioRecursoId } } });
    try { await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow(); }
    finally { await db.papelRecurso.create({ data: { papelId, recursoId: relatorioRecursoId } }); }
  });
  it("ator bloqueado no banco não pode exportar com sessão ainda ativa", async () => {
    const painel = await buscarIndicadores(periodo);
    await db.usuario.update({ where: { id: atorId }, data: { status: "BLOQUEADO" } });
    try { await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow(); }
    finally { await db.usuario.update({ where: { id: atorId }, data: { status: "ATIVO" } }); }
  });
  it("simulação com atores reais grava auditoria no admin e vincula o usuário efetivo", async () => {
    sessao.atorRealId = adminRealId; sessao.impersonando = true;
    const painel = await buscarIndicadores(periodo);
    await exportarCsv(painel.tokenExportacao);
    const registro = await db.auditoria.findFirstOrThrow({ where: { entityId: painel.snapshotId } });
    expect(registro.actorId).toBe(adminRealId);
    expect(registro.afterJson).toMatchObject({ usuarioEfetivoId: atorId, impersonando: true });
  });
  it("admin real bloqueado no banco perde exportação de snapshot da simulação", async () => {
    sessao.atorRealId = adminRealId; sessao.impersonando = true;
    const painel = await buscarIndicadores(periodo);
    await db.usuario.update({ where: { id: adminRealId }, data: { status: "BLOQUEADO" } });
    try {
      await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow();
      expect(await db.auditoria.count({ where: { entityId: painel.snapshotId } })).toBe(0);
    } finally { await db.usuario.update({ where: { id: adminRealId }, data: { status: "ATIVO" } }); }
  });
});
