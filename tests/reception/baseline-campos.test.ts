import { describe, expect, it } from "vitest";

import {
  mesclarComImportacao,
  ORIGENS_DIGITADAS,
  reclassificarEdicoes,
  type CamposBaseline,
} from "@/server/reception/baseline-campos";

const VAZIOS: CamposBaseline = {
  diagnosticos: [],
  alergias: [],
  medicacoes: [],
  internacoes: [],
};

const IMPORTADA: CamposBaseline = {
  diagnosticos: ["Paralisia cerebral", "Epilepsia"],
  alergias: ["Dipirona"],
  medicacoes: [{ nome: "Carbamazepina", dosagem: "200mg" }],
  internacoes: ["2024 - Pneumonia"],
};

describe("mesclarComImportacao", () => {
  it("campos vazios recebem importado", () => {
    const { campos, origens } = mesclarComImportacao(
      VAZIOS,
      ORIGENS_DIGITADAS,
      IMPORTADA,
    );
    expect(campos).toEqual(IMPORTADA);
    expect(origens).toEqual({
      diagnosticos: "importado",
      alergias: "importado",
      medicacoes: "importado",
      internacoes: "importado",
    });
  });

  it("campo digitado com conteúdo diferente não é sobrescrito", () => {
    const atuais: CamposBaseline = {
      ...VAZIOS,
      diagnosticos: ["Asma (digitado à mão)"],
    };
    const { campos, origens } = mesclarComImportacao(
      atuais,
      ORIGENS_DIGITADAS,
      IMPORTADA,
    );
    expect(campos.diagnosticos).toEqual(["Asma (digitado à mão)"]);
    expect(origens.diagnosticos).toBe("digitado");
    expect(campos.alergias).toEqual(IMPORTADA.alergias);
  });

  it("lista importada vazia não apaga campo existente", () => {
    const parcial: Partial<CamposBaseline> = {
      diagnosticos: IMPORTADA.diagnosticos,
      alergias: [],
      medicacoes: [],
      internacoes: [],
    };
    const atuais: CamposBaseline = { ...VAZIOS, alergias: ["Látex"] };
    const { campos } = mesclarComImportacao(atuais, ORIGENS_DIGITADAS, parcial);
    expect(campos.alergias).toEqual(["Látex"]);
    expect(campos.diagnosticos).toEqual(IMPORTADA.diagnosticos);
  });
});

describe("reclassificarEdicoes", () => {
  const origensImportadas = {
    diagnosticos: "importado",
    alergias: "importado",
    medicacoes: "importado",
    internacoes: "importado",
  } as const;

  it("edição de campo importado vira digitado", () => {
    const editados: CamposBaseline = {
      ...IMPORTADA,
      diagnosticos: ["Paralisia cerebral", "Epilepsia (ajuste)"],
    };
    const origens = reclassificarEdicoes(
      IMPORTADA,
      origensImportadas,
      editados,
    );
    expect(origens.diagnosticos).toBe("digitado");
    expect(origens.alergias).toBe("importado");
  });

  it("campo intacto permanece importado", () => {
    const origens = reclassificarEdicoes(
      IMPORTADA,
      origensImportadas,
      IMPORTADA,
    );
    expect(origens).toEqual(origensImportadas);
  });

  it("campo digitado nunca volta a importado", () => {
    const origensDigitadas = { ...origensImportadas, internacoes: "digitado" as const };
    const origens = reclassificarEdicoes(IMPORTADA, origensDigitadas, IMPORTADA);
    expect(origens.internacoes).toBe("digitado");
  });
});
