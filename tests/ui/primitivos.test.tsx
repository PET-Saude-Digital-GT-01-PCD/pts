import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

describe("Button loading", () => {
  it("desabilita e marca aria-busy quando loading", () => {
    const html = renderToStaticMarkup(<Button loading>Salvar</Button>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("animate-spin");
  });

  it("sem loading não desabilita nem mostra spinner", () => {
    const html = renderToStaticMarkup(<Button>Salvar</Button>);
    expect(html).not.toContain("aria-busy");
    expect(html).not.toContain("disabled=\"\"");
    expect(html).not.toContain("animate-spin");
  });

  it("loading não sobrescreve disabled explícito", () => {
    const html = renderToStaticMarkup(<Button disabled>Salvar</Button>);
    expect(html).toContain("disabled=\"\"");
  });
});

describe("EmptyState", () => {
  it("renderiza título, descrição e ação", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        icon={Target}
        titulo="Nenhuma meta"
        descricao="Pactue a primeira meta."
        acao={<Button>Nova meta</Button>}
      />
    );
    expect(html).toContain("Nenhuma meta");
    expect(html).toContain("Pactue a primeira meta.");
    expect(html).toContain("Nova meta");
  });

  it("omite descrição e ação quando ausentes", () => {
    const html = renderToStaticMarkup(<EmptyState titulo="Vazio" />);
    expect(html).toContain("Vazio");
    expect(html).not.toContain("<svg");
  });
});

describe("FormField", () => {
  it("liga label, dica e erro ao controle via aria", () => {
    const html = renderToStaticMarkup(
      <FormField id="motivo" label="Motivo" dica="Seja breve." erro="Obrigatório" obrigatorio>
        {(aria) => <Input {...aria} name="motivo" />}
      </FormField>
    );
    expect(html).toContain('for="motivo"');
    expect(html).toContain('id="motivo-dica"');
    expect(html).toContain('id="motivo-erro"');
    expect(html).toContain('aria-describedby="motivo-dica motivo-erro"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("(obrigatório)");
  });

  it("sem erro não marca aria-invalid", () => {
    const html = renderToStaticMarkup(
      <FormField id="nome" label="Nome">
        {(aria) => <Input {...aria} name="nome" />}
      </FormField>
    );
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain("aria-describedby=");
  });
});
