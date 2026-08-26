import { describe, expect, it } from "vitest";

import {
  alertasDoCaso,
  visaoPorRecursos,
  type MetaResumo,
} from "@/server/care-plan/dashboard";

describe("care-plan/dashboard visaoPorRecursos", () => {
  it("gestor/admin (dashboard.ver) → GESTAO", () => {
    expect(visaoPorRecursos(["governanca.dashboard.ver"])).toBe("GESTAO");
    expect(
      visaoPorRecursos(["governanca.dashboard.ver", "admin.papeis.gerenciar"]),
    ).toBe("GESTAO");
  });

  it("clínico com care-plan → CLINICA", () => {
    expect(visaoPorRecursos(["care-plan.meta.ler"])).toBe("CLINICA");
    expect(
      visaoPorRecursos([
        "clinical.avaliacao.ler",
        "care-plan.meta.escrever",
      ]),
    ).toBe("CLINICA");
  });

  it("referência com triagem.ver + care-plan → CLINICA (não recepção)", () => {
    expect(
      visaoPorRecursos(["triage.triagem.ver", "care-plan.meta.ler"]),
    ).toBe("CLINICA");
  });

  it("recepção/triador sem care-plan → RECEPCAO_TRIAGEM", () => {
    expect(visaoPorRecursos(["recepcao.paciente.cadastrar"])).toBe(
      "RECEPCAO_TRIAGEM",
    );
    expect(visaoPorRecursos(["triage.triagem.escrever"])).toBe(
      "RECEPCAO_TRIAGEM",
    );
  });

  it("sem recursos reconhecidos → null", () => {
    expect(visaoPorRecursos([])).toBeNull();
    expect(visaoPorRecursos(["admin.usuarios.ver"])).toBeNull();
  });
});

const DIA = 24 * 60 * 60 * 1000;

function meta(prazo: Date, status: MetaResumo["status"]): MetaResumo {
  return { prazo, status };
}

describe("care-plan/dashboard alertasDoCaso", () => {
  const agora = new Date("2026-08-26T12:00:00Z");

  it("sem alertas para caso novo com metas em dia", () => {
    const alertas = alertasDoCaso(
      {
        status: "SEGUIMENTO",
        aberturaEm: new Date(agora.getTime() - 5 * DIA),
      },
      [meta(new Date(agora.getTime() + 10 * DIA), "EM_ANDAMENTO")],
      agora,
    );
    expect(alertas).toEqual([]);
  });

  it("alerta meta vencida (prazo passado, não concluída)", () => {
    const alertas = alertasDoCaso(
      {
        status: "PACTACAO",
        aberturaEm: new Date(agora.getTime() - 5 * DIA),
      },
      [meta(new Date(agora.getTime() - 1 * DIA), "EM_ANDAMENTO")],
      agora,
    );
    expect(alertas).toEqual(["1 meta com prazo vencido"]);
  });

  it("meta concluída vencida não alerta", () => {
    const alertas = alertasDoCaso(
      {
        status: "SEGUIMENTO",
        aberturaEm: new Date(agora.getTime() - 5 * DIA),
      },
      [meta(new Date(agora.getTime() - 1 * DIA), "CONCLUIDA")],
      agora,
    );
    expect(alertas).toEqual([]);
  });

  it("conta plural de metas vencidas", () => {
    const alertas = alertasDoCaso(
      {
        status: "SEGUIMENTO",
        aberturaEm: new Date(agora.getTime() - 5 * DIA),
      },
      [
        meta(new Date(agora.getTime() - 1 * DIA), "NOVA"),
        meta(new Date(agora.getTime() - 2 * DIA), "EM_ANDAMENTO"),
      ],
      agora,
    );
    expect(alertas).toEqual(["2 metas com prazo vencido"]);
  });

  it("alerta caso parado em avaliação há mais de 60 dias", () => {
    const alertas = alertasDoCaso(
      {
        status: "EM_AVALIACAO",
        aberturaEm: new Date(agora.getTime() - 61 * DIA),
      },
      [],
      agora,
    );
    expect(alertas).toEqual(["Aberto há mais de 60 dias em avaliação"]);
  });

  it("caso fechado nunca alerta paralisia", () => {
    const alertas = alertasDoCaso(
      {
        status: "FECHADO",
        aberturaEm: new Date(agora.getTime() - 200 * DIA),
      },
      [],
      agora,
    );
    expect(alertas).toEqual([]);
  });
});
