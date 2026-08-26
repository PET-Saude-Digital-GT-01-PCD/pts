import type { BaselinePaciente, Medicacao } from "../canonical";

// Tradutor canônico ↔ FHIR R4 mínimo (ADR-0008).
// Mapeamento: Patient (identificador), Condition (diagnósticos),
// AllergyIntolerance (alergias), MedicationStatement (medicações),
// Procedure (internações). ponytail: teto = campos text simples;
// upgrade = codificação terminológica (CID/SNOMED) quando piloto definir.

type FhirResource = { resourceType: string; [k: string]: unknown };
export type FhirBundle = { resourceType: "Bundle"; entry: { resource: FhirResource }[] };

export function baselineParaFhir(b: BaselinePaciente): FhirBundle {
  const entry: { resource: FhirResource }[] = [
    {
      resource: {
        resourceType: "Patient",
        identifier: [{ value: b.identificador }],
      },
    },
    ...b.diagnosticos.map((texto) => ({
      resource: {
        resourceType: "Condition",
        code: { text: texto },
        subject: { reference: `Patient/${b.identificador}` },
      },
    })),
    ...b.alergias.map((texto) => ({
      resource: {
        resourceType: "AllergyIntolerance",
        code: { text: texto },
        patient: { reference: `Patient/${b.identificador}` },
      },
    })),
    ...b.medicacoes.map((m) => ({
      resource: {
        resourceType: "MedicationStatement",
        medicationCodeableConcept: { text: m.nome },
        dosageText: m.dosagem,
        subject: { reference: `Patient/${b.identificador}` },
      },
    })),
    ...b.internacoes.map((texto) => ({
      resource: {
        resourceType: "Procedure",
        status: "completed",
        code: { text: texto },
        subject: { reference: `Patient/${b.identificador}` },
      },
    })),
  ];
  return { resourceType: "Bundle", entry };
}

function textos(bundle: FhirBundle, resourceType: string): string[] {
  return bundle.entry
    .map((e) => e.resource)
    .filter((r) => r.resourceType === resourceType)
    .map(
      (r) =>
        ((r.code ?? r.medicationCodeableConcept) as { text?: string }).text,
    )
    .filter((t): t is string => typeof t === "string");
}

function medicacoesDoFhir(
  bundle: FhirBundle,
): Medicacao[] {
  return bundle.entry
    .map((e) => e.resource)
    .filter((r) => r.resourceType === "MedicationStatement")
    .map((r) => ({
      nome: String(
        (r.medicationCodeableConcept as { text?: string } | undefined)?.text ??
          "",
      ),
      dosagem:
        typeof r.dosageText === "string" ? r.dosageText : null,
    }));
}

export function fhirParaBaseline(bundle: FhirBundle): BaselinePaciente {
  const patient = bundle.entry
    .map((e) => e.resource)
    .find((r) => r.resourceType === "Patient");
  const identificador = String(
    (
      (patient?.identifier as { value?: string }[] | undefined)?.[0] ?? {}
    ).value ?? "",
  );
  return {
    identificador,
    diagnosticos: textos(bundle, "Condition"),
    alergias: textos(bundle, "AllergyIntolerance"),
    medicacoes: medicacoesDoFhir(bundle),
    internacoes: textos(bundle, "Procedure"),
  };
}
