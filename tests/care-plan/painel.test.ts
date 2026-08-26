import { describe, expect, it } from "vitest";

import { montarTimeline } from "@/server/care-plan/painel";

const d = (iso: string) => new Date(iso);

describe("care-plan/painel — montarTimeline", () => {
  it("timeline vazia mostra só a abertura do PTS", () => {
    const itens = montarTimeline({ aberturaEm: d("2026-01-10T10:00Z") });
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ tipo: "abertura", titulo: "PTS aberto" });
  });

  it("agrega avaliações, metas, revisões e triagens ordenadas por data desc", () => {
    const itens = montarTimeline({
      aberturaEm: d("2026-01-01T10:00Z"),
      avaliacoes: [
        { id: "a1", especialidade: "FISIO", criadaEm: d("2026-01-05T10:00Z") },
      ],
      metas: [
        {
          id: "m1",
          descTecnica: "Ganho de amplitude de joelho",
          dataPactuacao: d("2026-01-08T10:00Z"),
        },
      ],
      revisoes: [
        { id: "r1", numero: 1, motivo: "Reavaliação programada", data: d("2026-02-01T10:00Z") },
      ],
      triagens: [
        { id: "t1", classificacao: "AMARELO", criadaEm: d("2026-01-03T10:00Z") },
      ],
    });

    expect(itens.map((i) => i.tipo)).toEqual([
      "revisao",
      "meta",
      "avaliacao",
      "triagem",
      "abertura",
    ]);
    expect(itens[0].titulo).toContain("#1");
    expect(itens[1].detalhe).toContain("amplitude");
    expect(itens[3].titulo).toContain("AMARELO");
  });

  it("eventos de cuidado entram na timeline (#25)", () => {
    const itens = montarTimeline({
      aberturaEm: d("2026-01-01T10:00Z"),
      eventosCuidado: [
        { id: "e1", tipo: "FALTA", data: d("2026-01-20T14:00Z") },
      ],
    });
    expect(itens[0]).toMatchObject({
      tipo: "evento_cuidado",
      titulo: "Evento de cuidado (FALTA)",
    });
  });

  it("não muta os arrays de entrada", () => {
    const avaliacoes = [
      { id: "a1", especialidade: "SOAP", criadaEm: d("2026-01-05T10:00Z") },
    ];
    montarTimeline({
      aberturaEm: d("2026-01-01T10:00Z"),
      avaliacoes,
    });
    expect(avaliacoes).toHaveLength(1);
  });
});
