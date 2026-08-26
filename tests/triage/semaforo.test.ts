import { describe, expect, it } from "vitest";

import {
  calcularSemaforo,
  type EntradaSemaforo,
} from "@/server/triage/semaforo";

const entradaVerde: EntradaSemaforo = {
  bandeiras: { motivoAgudo: false, altaHospitalarRecente: false, posCirurgico: false },
  funcional: [90, 85, 80, 95],
  social: { cuidadorPresente: true, zaritScore: 0, vulnerabilidades: 0 },
};

describe("triage/semaforo", () => {
  it("bandeira clínica ativa → VERMELHO direto (independente dos outros eixos)", () => {
    for (const bandeiras of [
      { motivoAgudo: true, altaHospitalarRecente: false, posCirurgico: false },
      { motivoAgudo: false, altaHospitalarRecente: true, posCirurgico: false },
      { motivoAgudo: false, altaHospitalarRecente: false, posCirurgico: true },
    ]) {
      const r = calcularSemaforo({ ...entradaVerde, bandeiras });
      expect(r.classificacao).toBe("VERMELHO");
      expect(r.pontuacaoJson).toMatchObject({ regraDisparo: "bandeira_clinica" });
    }
  });

  it("média funcional < 40 → VERMELHO; limite exato 40 não é vermelho por média", () => {
    const r39 = calcularSemaforo({
      ...entradaVerde,
      funcional: [10, 20, 30, 39],
    });
    expect(r39.classificacao).toBe("VERMELHO");

    const r40 = calcularSemaforo({
      ...entradaVerde,
      funcional: [10, 20, 50, 80], // média exata 40
    });
    expect(r40.classificacao).toBe("AMARELO");
    expect(r40.pontuacaoJson).toMatchObject({ mediaFuncional: 40, regraDisparo: "eixo_funcional" });
  });

  it("média funcional < 70 → AMARELO; limite exato 70 segue para eixo social", () => {
    const r6999 = calcularSemaforo({
      ...entradaVerde,
      funcional: [60, 70, 70, 69.5],
    });
    expect(r6999.classificacao).toBe("AMARELO");

    // média 70 + social tranquilo → VERDE
    const r70 = calcularSemaforo({
      ...entradaVerde,
      funcional: [70, 70, 70, 70],
    });
    expect(r70.classificacao).toBe("VERDE");
  });

  it("cuidador ausente eleva 1 nível (VERDE→AMARELO)", () => {
    const r = calcularSemaforo({
      ...entradaVerde,
      social: { cuidadorPresente: false, zaritScore: 0, vulnerabilidades: 0 },
    });
    expect(r.classificacao).toBe("AMARELO");
    expect(r.pontuacaoJson).toMatchObject({ regraDisparo: "eixo_social" });
  });

  it("zarit >= 12 eleva 1 nível; zarit 11.99... não; limite exato 12 sim", () => {
    const r12 = calcularSemaforo({
      ...entradaVerde,
      social: { cuidadorPresente: true, zaritScore: 12, vulnerabilidades: 0 },
    });
    expect(r12.classificacao).toBe("AMARELO");

    const r11 = calcularSemaforo({
      ...entradaVerde,
      social: { cuidadorPresente: true, zaritScore: 11.5, vulnerabilidades: 0 },
    });
    expect(r11.classificacao).toBe("VERDE");
  });

  it("AMARELO + gatilho social → VERMELHO", () => {
    const r = calcularSemaforo({
      bandeiras: { motivoAgudo: false, altaHospitalarRecente: false, posCirurgico: false },
      funcional: [60, 65, 70, 75], // média 67.5 → AMARELO
      social: { cuidadorPresente: false, zaritScore: 5, vulnerabilidades: 1 },
    });
    expect(r.classificacao).toBe("VERMELHO");
    expect(r.pontuacaoJson).toMatchObject({ regraDisparo: "eixo_social" });
  });

  it("vulnerabilidades somam pontos ao score social no pontuacaoJson", () => {
    const r = calcularSemaforo({
      ...entradaVerde,
      social: { cuidadorPresente: true, zaritScore: 3, vulnerabilidades: 2 },
    });
    const json = r.pontuacaoJson as { pontosSociais: number };
    expect(json.pontosSociais).toBe(2);
    expect(r.classificacao).toBe("VERDE");
  });

  it("pontuacaoJson completo para reprodutibilidade (bandeiras, média, sociais)", () => {
    const entrada: EntradaSemaforo = {
      bandeiras: { motivoAgudo: false, altaHospitalarRecente: true, posCirurgico: false },
      funcional: [50, 60, 55, 45],
      social: { cuidadorPresente: true, zaritScore: 14, vulnerabilidades: 1 },
    };
    const r = calcularSemaforo(entrada);
    expect(r.pontuacaoJson).toEqual({
      bandeiras: entrada.bandeiras,
      mediaFuncional: 52.5,
      social: entrada.social,
      pontosSociais: 1,
      regraDisparo: "bandeira_clinica",
    });
  });

  it("determinismo: mesmo input → mesma saída (deep equal)", () => {
    const a = calcularSemaforo(entradaVerde);
    const b = calcularSemaforo(structuredClone(entradaVerde));
    expect(a).toEqual(b);
  });

  it("sem I/O: função não lança com entradas de borda válidas", () => {
    expect(() =>
      calcularSemaforo({
        bandeiras: { motivoAgudo: false, altaHospitalarRecente: false, posCirurgico: false },
        funcional: [0, 0, 0, 100],
        social: { cuidadorPresente: false, zaritScore: 48, vulnerabilidades: 5 },
      }),
    ).not.toThrow();
  });
});
