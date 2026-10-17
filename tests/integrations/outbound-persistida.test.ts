import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { enfileirarOutbound } from "@/server/integrations/outbound/persistida";

const eventoIds: string[] = [];
const cerIds: string[] = [];
let cerId: string;

beforeAll(async () => {
  const cer = await db.cer.create({
    data: { nome: `CER Outbound ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
  });
  cerId = cer.id;
  cerIds.push(cer.id);
});

afterAll(async () => {
  await db.outboundEvent.deleteMany({ where: { id: { in: eventoIds } } });
  await db.cer.deleteMany({ where: { id: { in: cerIds } } });
  await db.$disconnect();
});

describe("integrations/outbound — enfileirarOutbound (fila persistida ADR-0006)", () => {
  it("insere evento PENDING com o payload informado e o CER", async () => {
    const payload = { ptsId: randomUUID(), pacienteId: randomUUID() };
    const { id, duplicado } = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "MARKER_ESUS", payload, cerId),
    );
    eventoIds.push(id);
    expect(duplicado).toBe(false);

    const evento = await db.outboundEvent.findUniqueOrThrow({ where: { id } });
    expect(evento.tipo).toBe("MARKER_ESUS");
    expect(evento.status).toBe("PENDING");
    expect(evento.attempts).toBe(0);
    expect(evento.cerId).toBe(cerId);
    expect(evento.payloadJson).toMatchObject(payload);
  });

  it("idempotência por hash: mesmo tipo+payload+CER reaproveita o evento existente", async () => {
    const payload = { ptsId: randomUUID(), motivo: "guia à APS" };
    const primeiro = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "REFERRAL", payload, cerId),
    );
    eventoIds.push(primeiro.id);
    expect(primeiro.duplicado).toBe(false);

    const segundo = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "REFERRAL", payload, cerId),
    );
    expect(segundo.duplicado).toBe(true);
    expect(segundo.id).toBe(primeiro.id);

    const registrado = await db.outboundEvent.findUniqueOrThrow({
      where: { id: primeiro.id },
    });
    const total = await db.outboundEvent.count({
      where: { tipo: "REFERRAL", payloadHash: registrado.payloadHash },
    });
    expect(total).toBe(1);
  });

  it("mesmo payload em CER diferente NÃO é tratado como duplicado", async () => {
    const outroCer = await db.cer.create({
      data: { nome: `CER Outbound B ${randomUUID().slice(0, 8)}`, municipio: "Teste" },
    });
    cerIds.push(outroCer.id);

    const payload = { ptsId: randomUUID(), motivo: "mesma guia" };
    const a = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "REFERRAL", payload, cerId),
    );
    const b = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "REFERRAL", payload, outroCer.id),
    );
    eventoIds.push(a.id, b.id);

    expect(b.duplicado).toBe(false);
    expect(b.id).not.toBe(a.id);
  });

  it("payload diferente (mesmo tipo) não é tratado como duplicado", async () => {
    const a = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "NOTIFICACAO", { alvo: "a" }, cerId),
    );
    const b = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "NOTIFICACAO", { alvo: "b" }, cerId),
    );
    eventoIds.push(a.id, b.id);
    expect(a.id).not.toBe(b.id);
    expect(b.duplicado).toBe(false);
  });

  it("rollback da transação descarta o evento enfileirado (não fica órfão)", async () => {
    const payload = { marcador: randomUUID() };
    let idNaTransacao: string | undefined;

    await expect(
      db.$transaction(async (tx) => {
        const r = await enfileirarOutbound(tx, "MARKER_ESUS", payload, cerId);
        idNaTransacao = r.id;
        throw new Error("falha proposital após enfileirar");
      }),
    ).rejects.toThrow("falha proposital");

    expect(idNaTransacao).toBeDefined();
    const evento = await db.outboundEvent.findUnique({
      where: { id: idNaTransacao! },
    });
    expect(evento).toBeNull();
  });
});
