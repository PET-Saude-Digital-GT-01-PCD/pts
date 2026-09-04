import { describe, expect, it, afterAll } from "vitest";
import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { enfileirarOutbound } from "@/server/integrations/outbound/persistida";

const eventoIds: string[] = [];

afterAll(async () => {
  await db.outboundEvent.deleteMany({ where: { id: { in: eventoIds } } });
  await db.$disconnect();
});

describe("integrations/outbound — enfileirarOutbound (fila persistida ADR-0006)", () => {
  it("insere evento PENDING com o payload informado", async () => {
    const payload = { ptsId: randomUUID(), pacienteId: randomUUID() };
    const { id, duplicado } = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "MARKER_ESUS", payload),
    );
    eventoIds.push(id);
    expect(duplicado).toBe(false);

    const evento = await db.outboundEvent.findUniqueOrThrow({ where: { id } });
    expect(evento.tipo).toBe("MARKER_ESUS");
    expect(evento.status).toBe("PENDING");
    expect(evento.attempts).toBe(0);
    expect(evento.payloadJson).toMatchObject(payload);
  });

  it("idempotência por hash: mesmo tipo+payload reaproveita o evento existente", async () => {
    const payload = { ptsId: randomUUID(), motivo: "guia à APS" };
    const primeiro = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "REFERRAL", payload),
    );
    eventoIds.push(primeiro.id);
    expect(primeiro.duplicado).toBe(false);

    const segundo = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "REFERRAL", payload),
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

  it("payload diferente (mesmo tipo) não é tratado como duplicado", async () => {
    const a = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "NOTIFICACAO", { alvo: "a" }),
    );
    const b = await db.$transaction((tx) =>
      enfileirarOutbound(tx, "NOTIFICACAO", { alvo: "b" }),
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
        const r = await enfileirarOutbound(tx, "MARKER_ESUS", payload);
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
