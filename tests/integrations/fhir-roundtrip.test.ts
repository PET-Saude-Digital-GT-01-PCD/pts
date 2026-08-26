import { describe, expect, it } from "vitest";

import type { BaselinePaciente } from "@/server/integrations/canonical";
import {
  baselineParaFhir,
  fhirParaBaseline,
} from "@/server/integrations/format/fhir";

const COMPLETA: BaselinePaciente = {
  identificador: "52998224725",
  diagnosticos: ["Paralisia cerebral", "Epilepsia"],
  alergias: ["Dipirona"],
  medicacoes: [{ nome: "Carbamazepina", dosagem: "200mg" }],
  internacoes: ["2024 - Pneumonia"],
};

const VAZIA: BaselinePaciente = {
  identificador: "11144477735",
  diagnosticos: [],
  alergias: [],
  medicacoes: [],
  internacoes: [],
};

describe("tradutor FHIR R4", () => {
  it("round-trip canônico → FHIR → canônico (completa)", () => {
    expect(fhirParaBaseline(baselineParaFhir(COMPLETA))).toEqual(COMPLETA);
  });

  it("round-trip com baseline vazia (só identificador)", () => {
    expect(fhirParaBaseline(baselineParaFhir(VAZIA))).toEqual(VAZIA);
  });

  it("dosagem ausente vira null no round-trip", () => {
    const semDosagem = {
      ...COMPLETA,
      medicacoes: [{ nome: "Baclofeno", dosagem: null }],
    };
    expect(fhirParaBaseline(baselineParaFhir(semDosagem))).toEqual(semDosagem);
  });

  it("bundle contém recursos FHIR esperados", () => {
    const bundle = baselineParaFhir(COMPLETA);
    const tipos = bundle.entry.map((e) => e.resource.resourceType);
    expect(tipos).toContain("Patient");
    expect(tipos).toContain("Condition");
    expect(tipos).toContain("AllergyIntolerance");
    expect(tipos).toContain("MedicationStatement");
    expect(tipos).toContain("Procedure");
  });
});
