import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { IndicadoresCards } from "@/app/governanca/indicadores-cards";
import { montarIndicador } from "@/server/governance/indicadores";

describe("cards de governança — renderização sem navegador", () => {
  it("explicita situação atual, período, fonte e fórmula", () => {
    const indicadores = [montarIndicador("north-star", 50), montarIndicador("adesao", 75), montarIndicador("tempo-recepcao", null)];
    const html = renderToStaticMarkup(<IndicadoresCards indicadores={indicadores} carregando={false} />);
    for (const label of ["Situação atual", "No período aplicado", "Fonte ainda indisponível", "Fonte:", "Cálculo:"]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-busy="false"');
    expect(html).toContain("50%");
    expect(html).toContain("75%");
  });

  it("zero disponível permanece um número, sem mensagem de ausência", () => {
    const html = renderToStaticMarkup(<IndicadoresCards indicadores={[montarIndicador("adesao", 0)]} carregando={false} />);
    expect(html).toContain(">0%</p>");
    expect(html).toContain("Atenção");
    expect(html).not.toContain("Nenhum dado disponível");
    expect(html).not.toContain("Sem dado");
  });

  it("valor indisponível permanece vazio e nunca simula número clínico", () => {
    const inconsistente = { ...montarIndicador("adesao", 99.9), disponivel: false };
    const html = renderToStaticMarkup(<IndicadoresCards indicadores={[inconsistente]} carregando={false} />);
    expect(html).toContain("Nenhum dado disponível para os indicadores");
    expect(html).toContain("Sem dado");
    expect(html).toContain("—");
    expect(html).not.toContain("99.9%");
  });

  it("carregamento marca a região existente como ocupada", () => {
    const html = renderToStaticMarkup(<IndicadoresCards indicadores={[montarIndicador("adesao", 75)]} carregando />);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("75%");
  });
});
