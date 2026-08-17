import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  SEMAFORO_LABEL,
  Semaforo,
  semaforoClasses,
  type SemaforoStatus,
} from "@/components/ui/semaforo";

describe("semaforoClasses", () => {
  it.each([
    ["verde", "text-success"],
    ["amarelo", "text-warning"],
    ["vermelho", "text-destructive"],
  ] as const)("%s mapeia para %s", (status, esperado) => {
    expect(semaforoClasses(status)).toContain(esperado);
  });

  it("status inválido cai no neutro (fallback determinístico)", () => {
    expect(semaforoClasses("inexistente" as SemaforoStatus)).toContain(
      "text-muted-foreground"
    );
  });
});

describe("SEMAFORO_LABEL", () => {
  it("expõe rótulo para cada status", () => {
    expect(SEMAFORO_LABEL).toEqual({
      verde: "Verde",
      amarelo: "Amarelo",
      vermelho: "Vermelho",
    });
  });
});

describe("Semaforo", () => {
  it("renderiza badge com rótulo padrão", () => {
    const html = renderToStaticMarkup(<Semaforo status="verde" />);
    expect(html).toContain("Verde");
    expect(html).toContain("text-success");
  });

  it("aceita rótulo personalizado", () => {
    const html = renderToStaticMarkup(
      <Semaforo status="vermelho" label="Admissão imediata" />
    );
    expect(html).toContain("Admissão imediata");
  });
});