import { describe, expect, it } from "vitest";

import {
  montarResumoCaso,
  type PtsParaResumo,
} from "@/server/care-plan/resumo-caso";

const AGORA = new Date("2026-06-01T12:00:00Z");
const DIA = 86_400_000;
const dia = (offset: number) => new Date(AGORA.getTime() + offset * DIA);

type Meta = PtsParaResumo["metas"][number];

function meta(over: Partial<Meta> = {}): Meta {
  return {
    id: over.id ?? "m1",
    status: "EM_ANDAMENTO",
    dataPactuacao: dia(-10),
    prazo: dia(20),
    criteriosJson: null,
    dono: { categoria: "FISIOTERAPEUTA" },
    ...over,
  };
}

function pts(over: Partial<PtsParaResumo> = {}): PtsParaResumo {
  return {
    id: "pts-1",
    status: "SEGUIMENTO",
    aberturaEm: dia(-5),
    metas: [],
    avaliacoes: [],
    ...over,
  };
}

function soap(relato: Record<string, number>, avaliacaoClinica: Record<string, number>) {
  return { especialidade: "SOAP", dadosJson: { relato, avaliacaoClinica } };
}

describe("care-plan/resumo-caso — montarResumoCaso", () => {
  it("caso vazio e sem falta → tudo zerado, VERDE", () => {
    const r = montarResumoCaso(pts(), false, AGORA);
    expect(r.entradaReuniao).toEqual({
      divergenciaEspecialidades: false,
      conflitosMeta: 0,
      eventoRisco: false,
      pendenciaAjuste: false,
    });
    expect(r.sugestaoSemaforo).toBe("VERDE");
  });

  it("falta recente vira eventoRisco → VERMELHO", () => {
    const r = montarResumoCaso(pts(), true, AGORA);
    expect(r.entradaReuniao.eventoRisco).toBe(true);
    expect(r.sugestaoSemaforo).toBe("VERMELHO");
  });

  it("conta conflitos de meta (janelas sobrepostas) → VERMELHO", () => {
    const r = montarResumoCaso(
      pts({ metas: [meta({ id: "a" }), meta({ id: "b" })] }),
      false,
      AGORA,
    );
    expect(r.entradaReuniao.conflitosMeta).toBe(1);
    expect(r.sugestaoSemaforo).toBe("VERMELHO");
  });

  it("lê dominioFuncional de criteriosJson: mesmo domínio + categorias diferentes soma conflito de FOCO", () => {
    const r = montarResumoCaso(
      pts({
        metas: [
          meta({ id: "a", status: "NOVA", dataPactuacao: dia(0), prazo: dia(30),
            criteriosJson: { dominioFuncional: "marcha" } }),
          meta({ id: "b", status: "NOVA", dataPactuacao: dia(40), prazo: dia(50),
            criteriosJson: { dominioFuncional: "marcha" }, dono: { categoria: "TERAPEUTA_OCUPACIONAL" } }),
        ],
      }),
      false,
      AGORA,
    );
    // janelas não se tocam → só o conflito de foco
    expect(r.entradaReuniao.conflitosMeta).toBe(1);
  });

  it("criteriosJson sem dominioFuncional string não gera conflito de foco", () => {
    const r = montarResumoCaso(
      pts({
        metas: [
          meta({ id: "a", dataPactuacao: dia(0), prazo: dia(10), criteriosJson: { dominioFuncional: 1 } }),
          meta({ id: "b", dataPactuacao: dia(20), prazo: dia(30), criteriosJson: { dominioFuncional: 1 },
            dono: { categoria: "MEDICO" } }),
        ],
      }),
      false,
      AGORA,
    );
    expect(r.entradaReuniao.conflitosMeta).toBe(0);
  });

  it("metas fora de NOVA/EM_ANDAMENTO não entram no conflito", () => {
    const r = montarResumoCaso(
      pts({ metas: [meta({ id: "a", status: "CONCLUIDA" }), meta({ id: "b" })] }),
      false,
      AGORA,
    );
    expect(r.entradaReuniao.conflitosMeta).toBe(0);
  });

  it("divergência SOAP MEDIA ou ALTA marca divergenciaEspecialidades", () => {
    const media = montarResumoCaso(
      pts({ avaliacoes: [soap({ mobilidadeRelatada: 80 }, { mobilidadeMedida: 40 })] }),
      false,
      AGORA,
    );
    expect(media.entradaReuniao.divergenciaEspecialidades).toBe(true);
    expect(media.sugestaoSemaforo).toBe("VERMELHO");

    const alta = montarResumoCaso(
      pts({ avaliacoes: [soap({ mobilidadeRelatada: 90 }, { mobilidadeMedida: 10 })] }),
      false,
      AGORA,
    );
    expect(alta.entradaReuniao.divergenciaEspecialidades).toBe(true);
  });

  it("divergência BAIXA, avaliação não-SOAP ou dadosJson nulo não marcam divergência", () => {
    const r = montarResumoCaso(
      pts({
        avaliacoes: [
          soap({ mobilidadeRelatada: 60 }, { mobilidadeMedida: 50 }), // BAIXA
          { especialidade: "FISIOTERAPIA", dadosJson: { relato: { mobilidadeRelatada: 90 }, avaliacaoClinica: { mobilidadeMedida: 0 } } },
          { especialidade: "SOAP", dadosJson: null },
        ],
      }),
      false,
      AGORA,
    );
    expect(r.entradaReuniao.divergenciaEspecialidades).toBe(false);
  });

  it("meta ativa vencida vira pendenciaAjuste → AMARELO", () => {
    const r = montarResumoCaso(
      pts({ metas: [meta({ dataPactuacao: dia(-30), prazo: dia(-1) })] }),
      false,
      AGORA,
    );
    expect(r.entradaReuniao.pendenciaAjuste).toBe(true);
    expect(r.sugestaoSemaforo).toBe("AMARELO");
  });

  it("EM_AVALIACAO há mais de 60 dias vira pendenciaAjuste; 60 dias exatos ainda não", () => {
    const parado = montarResumoCaso(
      pts({ status: "EM_AVALIACAO", aberturaEm: dia(-61) }),
      false,
      AGORA,
    );
    expect(parado.entradaReuniao.pendenciaAjuste).toBe(true);

    const limite = montarResumoCaso(
      pts({ status: "EM_AVALIACAO", aberturaEm: dia(-60) }),
      false,
      AGORA,
    );
    expect(limite.entradaReuniao.pendenciaAjuste).toBe(false);
  });

  it("sinal vermelho prevalece sobre pendência amarela", () => {
    const r = montarResumoCaso(
      pts({ metas: [meta({ dataPactuacao: dia(-30), prazo: dia(-1) })] }),
      true,
      AGORA,
    );
    expect(r.entradaReuniao.pendenciaAjuste).toBe(true);
    expect(r.sugestaoSemaforo).toBe("VERMELHO");
  });
});
