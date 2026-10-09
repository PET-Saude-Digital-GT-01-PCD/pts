import { afterEach, describe, expect, it } from "vitest";
import { assinarSnapshot, verificarSnapshot, type ContextoExportacao } from "@/server/governance/snapshot";
import { montarIndicador, type RelatorioGovernanca } from "@/server/governance/indicadores";

const originalSecret = process.env.AUTH_SECRET;
afterEach(() => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
});
const geradoEm = "2024-03-01T12:00:00.000Z";
const contexto: ContextoExportacao = {
  usuarioId: "00000000-0000-4000-8000-000000000001",
  atorRealId: "00000000-0000-4000-8000-000000000001",
  cerId: "00000000-0000-4000-8000-000000000002",
  impersonando: false,
};
const relatorio: RelatorioGovernanca = {
  snapshotId: "00000000-0000-4000-8000-000000000003", geradoEm,
  cer: { id: contexto.cerId, nome: "CER Teste" },
  periodo: { desde: "2024-02-01", ate: "2024-02-29" }, cadenciaRevisaoDias: 90,
  indicadores: [
    montarIndicador("north-star", 50), montarIndicador("cobertura-baseline", 50),
    montarIndicador("metas-por-pts", 100), montarIndicador("adesao", 75),
    montarIndicador("tempo-primeira-avaliacao", 2), montarIndicador("divergencia-manual", 50),
    montarIndicador("tempo-recepcao", null), montarIndicador("pendencia-sync", null),
    montarIndicador("erro-integracao", null),
  ],
};
function token() {
  process.env.AUTH_SECRET = "unit-test-secret-for-governance-snapshot";
  return assinarSnapshot(relatorio, contexto);
}
describe("snapshot assinado", () => {
  it("preserva exatamente o relatório agregado autorizado", () => {
    const assinado = token();
    expect(verificarSnapshot(assinado, contexto, new Date(geradoEm))).toEqual(relatorio);
  });
  it("válido imediatamente antes de 24h, expirado no limite de 24h", () => {
    const assinado = token();
    expect(verificarSnapshot(assinado, contexto, new Date("2024-03-02T11:59:59.999Z"))).toEqual(relatorio);
    expect(() => verificarSnapshot(assinado, contexto, new Date("2024-03-02T12:00:00.000Z"))).toThrow();
  });
  it("nega snapshot gerado no futuro", () => {
    const assinado = token();
    expect(() => verificarSnapshot(assinado, contexto, new Date("2024-03-01T11:00:00.000Z"))).toThrow();
  });
  it.each([
    { usuarioId: "00000000-0000-4000-8000-000000000004" },
    { atorRealId: "00000000-0000-4000-8000-000000000004" },
    { cerId: "00000000-0000-4000-8000-000000000004" },
    { impersonando: true },
  ])("nega mudança de contexto %#", (mudanca) => {
    const assinado = token();
    expect(() => verificarSnapshot(assinado, { ...contexto, ...mudanca }, new Date(geradoEm))).toThrow();
  });
  it("nega conteúdo ou assinatura adulterados e formatos inválidos", () => {
    const assinado = token();
    const partes = assinado.split(".");
    const alterado = (assinado[0] === "A" ? "B" : "A") + assinado.slice(1);
    for (const invalido of [null, undefined, "", 10, {}, "abc", "A".repeat(128_001), assinado.slice(1), alterado,
      partes[0] + "." + "A".repeat(partes[1]?.length ?? 1)]) {
      expect(() => verificarSnapshot(invalido, contexto, new Date(geradoEm))).toThrow();
    }
  });
  it("rotação do segredo invalida o token anterior", () => {
    const assinado = token();
    process.env.AUTH_SECRET = "different-test-secret-for-governance";
    expect(() => verificarSnapshot(assinado, contexto, new Date(geradoEm))).toThrow();
  });
  it("sem segredo falha fechado para assinatura e verificação", () => {
    const assinado = token();
    delete process.env.AUTH_SECRET;
    expect(() => assinarSnapshot(relatorio, contexto)).toThrow();
    expect(() => verificarSnapshot(assinado, contexto, new Date(geradoEm))).toThrow();
  });
});
