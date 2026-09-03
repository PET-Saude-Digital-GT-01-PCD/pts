import { describe, expect, it } from "vitest";

import {
  validarCamposDinamicos,
  type CampoFormularioConfig,
} from "@/server/iam/formulario-config";

const CAMPO_TEXTO: CampoFormularioConfig = {
  campo: "telefone",
  rotulo: "Telefone",
  tipo: "TEXTO",
  obrigatorio: false,
  opcoes: null,
};

const CAMPO_NUMERO_OBRIGATORIO: CampoFormularioConfig = {
  campo: "anosExperiencia",
  rotulo: "Anos de experiência",
  tipo: "NUMERO",
  obrigatorio: true,
  opcoes: null,
};

const CAMPO_SELECT: CampoFormularioConfig = {
  campo: "turno",
  rotulo: "Turno preferencial",
  tipo: "SELECT",
  obrigatorio: false,
  opcoes: ["MANHA", "TARDE"],
};

const CAMPO_BOOLEANO: CampoFormularioConfig = {
  campo: "aceitaPlantao",
  rotulo: "Aceita plantão",
  tipo: "BOOLEANO",
  obrigatorio: false,
  opcoes: null,
};

describe("validarCamposDinamicos", () => {
  it("sem campos configurados: sempre ok, sem dados", () => {
    expect(validarCamposDinamicos([], { qualquer: "coisa" })).toEqual({
      ok: true,
      dados: {},
    });
  });

  it("campo opcional ausente é ignorado", () => {
    const r = validarCamposDinamicos([CAMPO_TEXTO], {});
    expect(r).toEqual({ ok: true, dados: {} });
  });

  it("campo obrigatório ausente falha com mensagem do rótulo", () => {
    const r = validarCamposDinamicos([CAMPO_NUMERO_OBRIGATORIO], {});
    expect(r).toEqual({
      ok: false,
      erro: "Anos de experiência é obrigatório.",
    });
  });

  it("campo obrigatório com string vazia falha (vazio != ausente)", () => {
    const r = validarCamposDinamicos([CAMPO_NUMERO_OBRIGATORIO], {
      anosExperiencia: "",
    });
    expect(r.ok).toBe(false);
  });

  it("texto: trima espaços", () => {
    const r = validarCamposDinamicos([CAMPO_TEXTO], { telefone: "  81 999 \n" });
    expect(r).toEqual({ ok: true, dados: { telefone: "81 999" } });
  });

  it("número: converte string numérica", () => {
    const r = validarCamposDinamicos([CAMPO_NUMERO_OBRIGATORIO], {
      anosExperiencia: "5",
    });
    expect(r).toEqual({ ok: true, dados: { anosExperiencia: 5 } });
  });

  it("número: zero é um valor válido, não 'ausente'", () => {
    const r = validarCamposDinamicos([CAMPO_NUMERO_OBRIGATORIO], {
      anosExperiencia: "0",
    });
    expect(r).toEqual({ ok: true, dados: { anosExperiencia: 0 } });
  });

  it("número: string não numérica falha", () => {
    const r = validarCamposDinamicos([CAMPO_NUMERO_OBRIGATORIO], {
      anosExperiencia: "cinco",
    });
    expect(r).toEqual({
      ok: false,
      erro: "Anos de experiência deve ser numérico.",
    });
  });

  it("select: opção dentro da lista passa", () => {
    const r = validarCamposDinamicos([CAMPO_SELECT], { turno: "MANHA" });
    expect(r).toEqual({ ok: true, dados: { turno: "MANHA" } });
  });

  it("select: opção fora da lista falha", () => {
    const r = validarCamposDinamicos([CAMPO_SELECT], { turno: "NOITE" });
    expect(r).toEqual({ ok: false, erro: "Turno preferencial: opção inválida." });
  });

  it("booleano: aceita 'on' (checkbox de FormData) como true", () => {
    const r = validarCamposDinamicos([CAMPO_BOOLEANO], { aceitaPlantao: "on" });
    expect(r).toEqual({ ok: true, dados: { aceitaPlantao: true } });
  });

  it("booleano: ausente (checkbox desmarcado em FormData) é ignorado, não vira false", () => {
    const r = validarCamposDinamicos([CAMPO_BOOLEANO], {});
    expect(r).toEqual({ ok: true, dados: {} });
  });

  it("múltiplos campos: para no primeiro erro", () => {
    const r = validarCamposDinamicos(
      [CAMPO_NUMERO_OBRIGATORIO, CAMPO_SELECT],
      { anosExperiencia: "abc", turno: "NOITE" },
    );
    expect(r).toEqual({
      ok: false,
      erro: "Anos de experiência deve ser numérico.",
    });
  });

  it("múltiplos campos válidos: agrega todos os dados", () => {
    const r = validarCamposDinamicos(
      [CAMPO_TEXTO, CAMPO_NUMERO_OBRIGATORIO, CAMPO_SELECT, CAMPO_BOOLEANO],
      {
        telefone: "81999999999",
        anosExperiencia: "3",
        turno: "TARDE",
        aceitaPlantao: "on",
      },
    );
    expect(r).toEqual({
      ok: true,
      dados: {
        telefone: "81999999999",
        anosExperiencia: 3,
        turno: "TARDE",
        aceitaPlantao: true,
      },
    });
  });
});
