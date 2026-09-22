import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { processarFilaOutbound } from "@/server/integrations/outbound/worker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function autorizado(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const recebido = request.headers.get("authorization") ?? "";
  const esperado = `Bearer ${secret}`;
  const recebidoHash = createHash("sha256").update(recebido).digest();
  const esperadoHash = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(recebidoHash, esperadoHash);
}

export async function GET(request: Request) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  try {
    const resultado = await processarFilaOutbound(5);
    return NextResponse.json(resultado, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    // Não retornar mensagens internas, connection strings ou payloads no log HTTP.
    return NextResponse.json(
      { erro: "Não foi possível processar a fila outbound." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
