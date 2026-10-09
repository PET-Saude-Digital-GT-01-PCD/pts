import { describe, expect, it } from "vitest";
import { lerCsv } from "./csv-helper";
import {
  classificarIndicador, limitesPeriodo, montarIndicador, paraCsv, periodoPadrao, validarFiltroRelatorio,
  type IndicadorGovernanca, type RelatorioGovernanca,
} from "@/server/governance/indicadores";

describe("classificarIndicador", () => {
  it.each([
    [null, 70, true, "SEM_DADO"], [null, 24, false, "SEM_DADO"],
    [80, 70, true, "OK"], [70, 70, true, "OK"], [69, 70, true, "ATENCAO"],
    [10, 24, false, "OK"], [24, 24, false, "OK"], [25, 24, false, "ATENCAO"],
    [0, 70, true, "ATENCAO"], [0, 0, false, "OK"],
  ] as const)("valor %s, meta %s, direção %s → %s", (valor, meta, direcao, status) => {
    expect(classificarIndicador(valor, meta, direcao)).toBe(status);
  });
});

describe("período civil de governança", () => {
  it("o padrão usa o dia UTC-03 e exatamente 30 dias inclusivos", () => {
    expect(periodoPadrao(new Date("2024-03-01T02:59:59.999Z")))
      .toEqual({ desde: "2024-01-31", ate: "2024-02-29" });
    expect(periodoPadrao(new Date("2024-03-01T03:00:00.000Z")))
      .toEqual({ desde: "2024-02-01", ate: "2024-03-01" });
  });
  it("aceita um único dia e o dia bissexto", () => {
    expect(validarFiltroRelatorio({ desde: "2024-02-29", ate: "2024-02-29" }))
      .toEqual({ periodo: { desde: "2024-02-29", ate: "2024-02-29" }, cadenciaRevisaoDias: 90 });
    expect(limitesPeriodo({ desde: "2024-02-29", ate: "2024-02-29" }))
      .toEqual({ desde: new Date("2024-02-29T03:00:00.000Z"), ateExclusivo: new Date("2024-03-01T03:00:00.000Z") });
  });
  it.each([
    { desde: "2024-01-01" }, { ate: "2024-01-01" },
    null, [], "2024-01-01", { outroCampo: true },
    { desde: "", ate: "" }, { desde: "2023-02-29", ate: "2023-03-01" },
    { desde: "2024-04-31", ate: "2024-05-01" },
    { desde: "2024-13-01", ate: "2025-01-01" },
    { desde: "2024-02-30", ate: "2024-03-01" },
    { desde: "2024-03-01", ate: "2024-02-29" },
    { desde: "2024-2-01", ate: "2024-02-29" },
    { desde: "2024-02-01T00:00:00Z", ate: "2024-02-29" },
    { desde: new Date("2024-02-01"), ate: new Date("2024-02-29") },
    { cadenciaRevisaoDias: 0 }, { cadenciaRevisaoDias: 366 },
    { cadenciaRevisaoDias: 1.5 }, { cadenciaRevisaoDias: "90" },
    { cadenciaRevisaoDias: NaN }, { cadenciaRevisaoDias: Infinity },
  ].map((entrada) => ({ entrada })))("rejeita filtro inválido %# sem normalizar silenciosamente", ({ entrada }) => {
    expect(() => validarFiltroRelatorio(entrada)).toThrow();
  });
  it.each([1, 30, 90, 365])("aceita cadência inteira %s", (cadenciaRevisaoDias) => {
    expect(validarFiltroRelatorio({ cadenciaRevisaoDias }).cadenciaRevisaoDias).toBe(cadenciaRevisaoDias);
  });
});

const indicador: IndicadorGovernanca = {
  id: "adesao", titulo: "Adesão", valor: 66.7, unidade: "%", meta: 70,
  maiorEhMelhor: true, fonte: "evento_cuidado", disponivel: true,
  escopoTemporal: "PERIODO", formula: "sessões / (sessões + faltas) × 100",
  descricaoTemporal: "Eventos no período aplicado",
};
const relatorio: RelatorioGovernanca = {
  snapshotId: "00000000-0000-4000-8000-000000000001",
  geradoEm: "2024-03-01T12:00:00.000Z",
  cer: { id: "00000000-0000-4000-8000-000000000002", nome: "CER Teste" },
  periodo: { desde: "2024-02-01", ate: "2024-02-29" },
  cadenciaRevisaoDias: 30, indicadores: [indicador],
};

describe("CSV brasileiro auditável", () => {
  it("BOM, CRLF, delimitador ponto e vírgula e decimal com vírgula", () => {
    const csv = paraCsv(relatorio);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv.replaceAll("\r\n", "")).not.toContain("\n");
    const [cabecalho, linha] = lerCsv(csv);
    expect(cabecalho).toEqual(["cer", "cer_id", "periodo_inicial", "periodo_final_inclusivo", "fuso_horario", "gerado_em_utc", "snapshot_id", "cadencia_revisao_dias", "indicador_id", "indicador", "valor", "unidade", "meta", "sentido_meta", "status", "disponivel", "escopo_temporal", "formula", "criterio_temporal", "fonte"]);
    expect(linha).toHaveLength(20);
    expect(linha).toContain("66,7");
    expect(linha).toContain("ATENCAO");
    for (const valor of ["2024-02-01", "2024-02-29", "CER Teste", relatorio.snapshotId, relatorio.geradoEm, "PERIODO", indicador.formula, indicador.descricaoTemporal]) {
      expect(linha).toContain(valor);
    }
    expect(linha[4]).toContain("America/Fortaleza");
    expect(linha[7]).toBe("30");
  });
  it("sem dado exporta valor vazio mesmo se receber um número inconsistente", () => {
    const csv = paraCsv({ ...relatorio, indicadores: [{ ...indicador, disponivel: false }] });
    expect(csv).toContain(";SEM_DADO;");
    expect(csv).not.toContain("66,7");
  });
  it("escapa delimitador, aspas, CR e LF em todos os textos", () => {
    const csv = paraCsv({ ...relatorio, cer: { ...relatorio.cer, nome: 'CER; "teste"\r\nsegunda linha' } });
    expect(csv).toContain('"CER; ""teste""\r\nsegunda linha"');
    expect(lerCsv(csv)[1][0]).toBe('CER; "teste"\r\nsegunda linha');
    expect(lerCsv(csv)[1]).toHaveLength(20);
  });
  it.each(["=1+1", "+SUM(A1:A2)", "-1+2", "@SUM(A1)", "\t=1+1", "\r=1+1", " =1+1"])(
    "neutraliza fórmula de planilha em texto %j", (nome) => {
      const csv = paraCsv({ ...relatorio, cer: { ...relatorio.cer, nome } });
      expect(lerCsv(csv)[1][0]).toBe("'" + nome);
    },
  );
  it("preserva o sinal de um número legítimo", () => {
    const csv = paraCsv({ ...relatorio, indicadores: [{ ...indicador, valor: -2.5 }] });
    expect(csv).toContain(";-2,5;");
  });
  it("repete os metadados em nove linhas retangulares incluindo fontes indisponíveis", () => {
    const ids = ["north-star", "cobertura-baseline", "metas-por-pts", "adesao", "tempo-primeira-avaliacao", "divergencia-manual", "tempo-recepcao", "pendencia-sync", "erro-integracao"] as const;
    const linhas = lerCsv(paraCsv({ ...relatorio, indicadores: ids.map((id) => montarIndicador(id, null)) }));
    expect(linhas).toHaveLength(10);
    expect(linhas.every((linha) => linha.length === 20)).toBe(true);
    for (const linha of linhas.slice(1)) {
      expect(linha.slice(0, 8)).toEqual(linhas[1].slice(0, 8));
      expect(linha[10]).toBe("");
      expect(linha[14]).toBe("SEM_DADO");
    }
    expect(linhas.slice(1).map((linha) => linha[8])).toEqual(ids);
  });
});
