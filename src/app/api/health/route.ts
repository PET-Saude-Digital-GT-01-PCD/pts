import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { causaDaFalhaDeBanco } from "@/server/shared/db-health";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // count() numa tabela real cobre conectividade E schema aplicado. Um
    // SELECT 1 passa em banco vazio — justamente o caso em que todas as
    // páginas quebram e o healthcheck diria "ok".
    await db.cer.count();
    return NextResponse.json({ status: "ok", db: "up" });
  } catch (erro) {
    return NextResponse.json(
      { status: "error", db: "down", causa: causaDaFalhaDeBanco(erro) },
      { status: 503 },
    );
  }
}
