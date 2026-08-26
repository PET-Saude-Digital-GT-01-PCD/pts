import { describe, expect, it } from "vitest";

import type { BaselinePaciente } from "@/server/integrations/canonical";
import {
  baselineParaXml,
  escaparXml,
  xmlParaBaseline,
} from "@/server/integrations/format/xml";

const COMPLETA: BaselinePaciente = {
  identificador: "52998224725",
  diagnosticos: ["Paralisia cerebral", "Epilepsia"],
  alergias: ["Dipirona"],
  medicacoes: [{ nome: "Carbamazepina", dosagem: "200mg" }],
  internacoes: ["2024 - Pneumonia"],
};

describe("tradutor XML mínimo", () => {
  it("round-trip canônico → XML → canônico", () => {
    expect(xmlParaBaseline(baselineParaXml(COMPLETA))).toEqual(COMPLETA);
  });

  it("baseline vazia round-tripa", () => {
    const vazia = {
      ...COMPLETA,
      diagnosticos: [],
      alergias: [],
      medicacoes: [],
      internacoes: [],
    };
    expect(xmlParaBaseline(baselineParaXml(vazia))).toEqual(vazia);
  });

  it("caracteres especiais sobrevivem ao round-trip", () => {
    const especial: BaselinePaciente = {
      ...COMPLETA,
      diagnosticos: ["Alergia & asma <grave> 'grave' \"grave\""],
      medicacoes: [{ nome: "Soro & glicose", dosagem: null }],
    };
    expect(xmlParaBaseline(baselineParaXml(especial))).toEqual(especial);
  });

  it("seção vazia não gera itens fantasma", () => {
    const xml = baselineParaXml({ ...COMPLETA, internacoes: [] });
    expect(xmlParaBaseline(xml).internacoes).toEqual([]);
  });

  it("escaparXml cobre os cinco caracteres obrigatórios", () => {
    expect(escaparXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });
});
