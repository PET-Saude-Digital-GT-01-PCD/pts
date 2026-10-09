import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const USUARIO = "00000000-0000-4000-8000-000000000001";
const CER = "00000000-0000-4000-8000-000000000002";
const ADMIN = "00000000-0000-4000-8000-000000000003";
function usuarioFresh() {
  return { id: USUARIO, status: "ATIVO", cerId: CER, cer: { id: CER, nome: "CER Seguro" },
    papel: { cerId: CER, ativo: true, base: "GESTOR", recursos: [
      { recurso: { chave: "governanca.dashboard.ver" } }, { recurso: { chave: "governanca.relatorios.ver" } },
    ] } };
}
const estado = vi.hoisted(() => ({
  usuario: null as ReturnType<typeof usuarioFresh> | null,
  admin: null as ReturnType<typeof usuarioFresh> | null,
  real: { atorRealId: "", impersonando: false, usuarioSimuladoId: null as string | null },
  sessaoId: "",
}));
const mocks = vi.hoisted(() => ({
  usuario: vi.fn(), pts: vi.fn(), paciente: vi.fn(), eventos: vi.fn(), triagens: vi.fn(),
  auditoria: vi.fn(), transacao: vi.fn(),
}));
vi.mock("@/server/iam/session", () => ({
  requireAuth: async () => ({ id: estado.sessaoId, cerId: "sessao-obsoleta", papelId: "papel-obsoleto" }),
  getAtorReal: async () => estado.real,
}));
vi.mock("@/lib/db", () => ({
  db: { $transaction: (...args: unknown[]) => mocks.transacao(...args) },
}));
import { buscarIndicadores, exportarCsv } from "@/server/governance/relatorios";
const segredoInicial = process.env.AUTH_SECRET;
afterAll(() => {
  if (segredoInicial === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = segredoInicial;
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.AUTH_SECRET = "governance-security-action-test-secret";
  estado.usuario = usuarioFresh(); estado.admin = null; estado.sessaoId = USUARIO;
  estado.real = { atorRealId: USUARIO, impersonando: false, usuarioSimuladoId: null };
  mocks.usuario.mockImplementation(async ({ where }: { where: { id: string } }) =>
    where.id === ADMIN ? estado.admin : estado.usuario);
  mocks.pts.mockResolvedValue([]); mocks.paciente.mockResolvedValue([]);
  mocks.eventos.mockResolvedValue([]); mocks.triagens.mockResolvedValue([]);
  mocks.auditoria.mockResolvedValue({ id: "auditoria-teste" });
  mocks.transacao.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
    usuario: { findUnique: mocks.usuario }, pts: { findMany: mocks.pts },
    paciente: { findMany: mocks.paciente }, eventoCuidado: { groupBy: mocks.eventos },
    triagem: { findMany: mocks.triagens }, auditoria: { create: mocks.auditoria },
  }));
});
describe("ações de governança — defesa e auditoria", () => {
  it.each(["ausente", "bloqueado", "cer-null", "cer-ausente", "papel-inativo", "papel-outro-cer"] as const)(
    "nega identidade atual %s antes de ler qualquer dado clínico", async (caso) => {
      if (caso === "ausente") estado.usuario = null;
      else if (caso === "bloqueado") estado.usuario!.status = "BLOQUEADO";
      else if (caso === "cer-null") Object.assign(estado.usuario!, { cerId: null });
      else if (caso === "cer-ausente") Object.assign(estado.usuario!, { cer: null });
      else if (caso === "papel-inativo") estado.usuario!.papel.ativo = false;
      else estado.usuario!.papel.cerId = ADMIN;
      await expect(buscarIndicadores()).rejects.toThrow();
      expect(mocks.pts).not.toHaveBeenCalled(); expect(mocks.eventos).not.toHaveBeenCalled();
      expect(mocks.auditoria).not.toHaveBeenCalled();
    },
  );
  it("falha de INSERT de auditoria impede entrega do CSV", async () => {
    const painel = await buscarIndicadores();
    mocks.auditoria.mockRejectedValueOnce(new Error("Auditoria indisponível"));
    await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow("Auditoria indisponível");
    expect(mocks.auditoria).toHaveBeenCalledTimes(1);
  });
  it("falha de commit da transação impede entrega após tentativa de auditoria", async () => {
    const painel = await buscarIndicadores();
    const callbackOriginal = mocks.transacao.getMockImplementation()!;
    mocks.transacao.mockImplementationOnce(async (...args: unknown[]) => {
      await callbackOriginal(...args);
      throw new Error("Commit indisponível");
    });
    await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow("Commit indisponível");
    expect(mocks.auditoria).toHaveBeenCalledTimes(1);
  });
  it("exportação não refaz agregados clínicos e audita o hash do conteúdo retornado", async () => {
    const painel = await buscarIndicadores();
    mocks.pts.mockClear(); mocks.paciente.mockClear(); mocks.eventos.mockClear(); mocks.triagens.mockClear();
    const arquivo = await exportarCsv(painel.tokenExportacao);
    expect(mocks.pts).not.toHaveBeenCalled(); expect(mocks.paciente).not.toHaveBeenCalled();
    expect(mocks.eventos).not.toHaveBeenCalled(); expect(mocks.triagens).not.toHaveBeenCalled();
    expect(mocks.auditoria).toHaveBeenCalledWith({ data: expect.objectContaining({
      actorId: USUARIO, action: "governanca.relatorios.exportar", entityType: "relatorio_governanca",
      entityId: painel.snapshotId, afterJson: expect.objectContaining({
        cerId: CER, periodo: painel.periodo, geradoEm: painel.geradoEm,
        fusoHorario: "America/Fortaleza", quantidadeIndicadores: 9,
        cadenciaRevisaoDias: 90, usuarioEfetivoId: USUARIO, impersonando: false,
        sha256: createHash("sha256").update(arquivo.conteudo, "utf8").digest("hex"),
      }),
    }) });
  });
  it("snapshot é consistente: leitura e exportação pedem RepeatableRead", async () => {
    const painel = await buscarIndicadores();
    await exportarCsv(painel.tokenExportacao);
    for (const chamada of mocks.transacao.mock.calls) expect(chamada[1]).toEqual({ isolationLevel: "RepeatableRead" });
  });
  it("simulação legítima audita admin real e usuário efetivo separadamente", async () => {
    estado.admin = { ...usuarioFresh(), id: ADMIN, papel: { ...usuarioFresh().papel, base: "ADMIN" } };
    estado.real = { atorRealId: ADMIN, impersonando: true, usuarioSimuladoId: USUARIO };
    const painel = await buscarIndicadores();
    await exportarCsv(painel.tokenExportacao);
    expect(mocks.auditoria).toHaveBeenCalledWith({ data: expect.objectContaining({
      actorId: ADMIN, afterJson: expect.objectContaining({ usuarioEfetivoId: USUARIO, impersonando: true }),
    }) });
  });
  it.each(["bloqueado", "papel-revogado", "outro-cer", "papel-inativo"] as const)(
    "simulação revalida admin real %s no momento da exportação", async (caso) => {
      estado.admin = { ...usuarioFresh(), id: ADMIN, papel: { ...usuarioFresh().papel, base: "ADMIN" } };
      estado.real = { atorRealId: ADMIN, impersonando: true, usuarioSimuladoId: USUARIO };
      const painel = await buscarIndicadores();
      if (caso === "bloqueado") estado.admin.status = "BLOQUEADO";
      else if (caso === "papel-revogado") estado.admin.papel.base = "GESTOR";
      else if (caso === "outro-cer") estado.admin.cerId = USUARIO;
      else estado.admin.papel.ativo = false;
      await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow();
      expect(mocks.auditoria).not.toHaveBeenCalled();
    },
  );
  it("token de sessão real não vale após entrar na simulação", async () => {
    const painel = await buscarIndicadores();
    estado.admin = { ...usuarioFresh(), id: ADMIN, papel: { ...usuarioFresh().papel, base: "ADMIN" } };
    estado.real = { atorRealId: ADMIN, impersonando: true, usuarioSimuladoId: USUARIO };
    await expect(exportarCsv(painel.tokenExportacao)).rejects.toThrow();
    expect(mocks.auditoria).not.toHaveBeenCalled();
  });
});
