import { describe, expect, it } from "vitest";

import { MockBaselineSource } from "@/server/integrations/sources/mock";

describe("MockBaselineSource", () => {
  const source = new MockBaselineSource();

  it("CPF completo → baseline completa determinística", async () => {
    const b = await source.getBaseline("52998224725");
    expect(b).not.toBeNull();
    expect(b!.diagnosticos.length).toBeGreaterThan(0);
    expect(b!.medicacoes.length).toBeGreaterThan(0);
    expect(b!.identificador).toBe("52998224725");
  });

  it("CPF parcial → baseline só com diagnósticos", async () => {
    const b = await source.getBaseline("11144477735");
    expect(b).not.toBeNull();
    expect(b!.diagnosticos.length).toBeGreaterThan(0);
    expect(b!.medicacoes).toHaveLength(0);
  });

  it("formatado com pontuação casa igual (só dígitos)", async () => {
    const b = await source.getBaseline("529.982.247-25");
    expect(b).not.toBeNull();
  });

  it("identificador desconhecido → null (não erro)", async () => {
    const b = await source.getBaseline("00000000000");
    expect(b).toBeNull();
  });

  it("duas chamadas → resultado idêntico (determinístico)", async () => {
    const a = await source.getBaseline("52998224725");
    const c = await source.getBaseline("52998224725");
    expect(a).toEqual(c);
  });
});
