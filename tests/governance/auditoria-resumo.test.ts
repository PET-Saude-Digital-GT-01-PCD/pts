import { describe, expect, it } from "vitest";

import { resumirJson } from "@/server/governance/auditoria-resumo";

describe("resumirJson", () => {
  it("null vira null", () => {
    expect(resumirJson(null)).toBeNull();
  });

  it("undefined vira null", () => {
    expect(resumirJson(undefined)).toBeNull();
  });

  it("objeto curto: serializa sem truncar", () => {
    expect(resumirJson({ status: "ATIVO" })).toBe('{"status":"ATIVO"}');
  });

  it("string curta: serializa como JSON (com aspas)", () => {
    expect(resumirJson("ok")).toBe('"ok"');
  });

  it("número e booleano: serializam como JSON puro", () => {
    expect(resumirJson(42)).toBe("42");
    expect(resumirJson(true)).toBe("true");
  });

  it("objeto grande: trunca no tamanho máximo e adiciona reticências", () => {
    const grande = { texto: "x".repeat(300) };
    const r = resumirJson(grande, 50);
    expect(r).not.toBeNull();
    expect(r!.length).toBe(51); // 50 chars + "…"
    expect(r!.endsWith("…")).toBe(true);
  });

  it("exatamente no limite: não trunca (sem reticências)", () => {
    const texto = "a".repeat(10);
    const r = resumirJson(texto, JSON.stringify(texto).length);
    expect(r).toBe(JSON.stringify(texto));
    expect(r!.endsWith("…")).toBe(false);
  });

  it("um char acima do limite: trunca", () => {
    const texto = "a".repeat(10);
    const tamanho = JSON.stringify(texto).length - 1;
    const r = resumirJson(texto, tamanho);
    expect(r!.endsWith("…")).toBe(true);
    expect(r!.length).toBe(tamanho + 1);
  });

  it("respeita tamanhoMaximo customizado diferente do padrão", () => {
    const grande = { a: "y".repeat(500) };
    const r10 = resumirJson(grande, 10);
    expect(r10!.length).toBe(11);
  });
});
