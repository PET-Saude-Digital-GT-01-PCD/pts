import { describe, expect, it } from "vitest";

import {
  ETAPAS_FLUXO,
  montarFluxo,
  type ContagensFluxo,
} from "@/server/care-plan/fluxo";

const vazio: ContagensFluxo = {
  pacientes: 0,
  aguardandoTriagem: 0,
  porStatus: {},
  contrarreferencias: 0,
};

describe("montarFluxo", () => {
  it("mantém a ordem da trilha do cuidado", () => {
    expect(montarFluxo(vazio).map((e) => e.id)).toEqual([
      "RECEPCAO",
      "TRIAGEM",
      "EM_AVALIACAO",
      "PACTACAO",
      "SEGUIMENTO",
      "REAVALIACAO",
      "FECHADO",
    ]);
  });

  it("usa a contagem certa por etapa (paciente, fila de triagem, status do PTS)", () => {
    const etapas = montarFluxo({
      pacientes: 12,
      aguardandoTriagem: 3,
      porStatus: { EM_AVALIACAO: 6, SEGUIMENTO: 2, FECHADO: 4 },
      contrarreferencias: 1,
    });
    const total = (id: string) => etapas.find((e) => e.id === id)?.total;

    expect(total("RECEPCAO")).toBe(12);
    expect(total("TRIAGEM")).toBe(3);
    expect(total("EM_AVALIACAO")).toBe(6);
    expect(total("SEGUIMENTO")).toBe(2);
    expect(total("FECHADO")).toBe(4);
    // status sem caso nenhum não some da trilha: aparece zerado
    expect(total("PACTACAO")).toBe(0);
    expect(total("REAVALIACAO")).toBe(0);
  });

  it("proporção é relativa ao maior volume e fica em 0 quando não há caso", () => {
    const etapas = montarFluxo({
      pacientes: 10,
      aguardandoTriagem: 5,
      porStatus: { EM_AVALIACAO: 5 },
      contrarreferencias: 0,
    });
    expect(etapas[0].proporcao).toBe(1);
    expect(etapas[1].proporcao).toBe(0.5);

    expect(montarFluxo(vazio).every((e) => e.proporcao === 0)).toBe(true);
  });

  it("saídas das etapas de PTS vêm da máquina de status", () => {
    const etapas = montarFluxo(vazio);
    const saidas = (id: string) => etapas.find((e) => e.id === id)?.saidas;

    expect(saidas("EM_AVALIACAO")).toEqual(["Pactuação"]);
    expect(saidas("REAVALIACAO")).toEqual(["Em avaliação", "Encerramento"]);
    expect(saidas("FECHADO")).toEqual(["Terminal"]);
    // etapas fora do PTS mantêm as saídas declaradas no catálogo
    expect(saidas("TRIAGEM")).toEqual(["Em avaliação", "Contrarreferência"]);
  });

  it("toda etapa declara os recursos RBAC de quem age nela", () => {
    expect(ETAPAS_FLUXO.every((e) => e.recursos.length > 0)).toBe(true);
  });
});
