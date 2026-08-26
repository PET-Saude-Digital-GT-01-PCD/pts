import { describe, expect, it } from "vitest";

import type { BaselinePaciente } from "@/server/integrations/canonical";
import { criarFilaMemoria } from "@/server/integrations/outbound/fila";
import { MockOutboundGateway } from "@/server/integrations/outbound/mock";
import {
  baselineParaJson,
  jsonParaBaseline,
} from "@/server/integrations/format/json";

const BASELINE: BaselinePaciente = {
  identificador: "52998224725",
  diagnosticos: ["PC"],
  alergias: [],
  medicacoes: [{ nome: "Baclofeno", dosagem: null }],
  internacoes: [],
};

describe("tradutor JSON", () => {
  it("round-trip canônico → JSON → canônico", () => {
    expect(jsonParaBaseline(baselineParaJson(BASELINE))).toEqual(BASELINE);
  });

  it("JSON malformado → erro claro", () => {
    const quebrado = JSON.stringify({ foo: "bar" });
    expect(() => jsonParaBaseline(quebrado)).toThrow(
      "JSON de baseline inválido",
    );
  });
});

describe("MockOutboundGateway", () => {
  it("enviar* retorna DeliveryReceipt ACEITO com id", async () => {
    const gw = new MockOutboundGateway();
    const r1 = await gw.enviarMarcacao({
      ptsRef: "pts-1",
      tipo: "META",
      descricao: "x",
      data: "2026-01-01",
    });
    const r2 = await gw.enviarReferencia({
      ptsRef: "pts-1",
      pacienteIdentificador: "52998224725",
      resumo: "x",
      destino: "eSF",
    });
    const r3 = await gw.enviarEvento("TESTE", { a: 1 });
    for (const r of [r1, r2, r3]) {
      expect(r.status).toBe("ACEITO");
      expect(r.id).toBeTruthy();
      expect(r.recebidoEm).toBeTruthy();
    }
    expect(r1.id).not.toBe(r3.id);
  });
});

describe("fila outbound em memória", () => {
  it("enfileira e drena na ordem FIFO", () => {
    const fila = criarFilaMemoria();
    fila.enfileirar("MARCACAO", { a: 1 });
    fila.enfileirar("REFERENCIA", { b: 2 });
    const drenados = fila.drenar();
    expect(drenados.map((e) => e.tipo)).toEqual(["MARCACAO", "REFERENCIA"]);
    expect(fila.drenar()).toEqual([]); // drenagem esvazia
  });
});
