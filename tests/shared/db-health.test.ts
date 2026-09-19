import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";

import { causaDaFalhaDeBanco } from "@/server/shared/db-health";

describe("causaDaFalhaDeBanco", () => {
  it("aponta env var ausente quando o Prisma não resolve a DATABASE_URL", () => {
    const erro = new Prisma.PrismaClientInitializationError(
      "error: Environment variable not found: DATABASE_URL.",
      "6.19.3",
    );

    expect(causaDaFalhaDeBanco(erro)).toContain("DATABASE_URL não definida");
  });

  it("aponta banco inalcançável em P1001", () => {
    const erro = new Prisma.PrismaClientInitializationError(
      "Can't reach database server",
      "6.19.3",
      "P1001",
    );

    expect(causaDaFalhaDeBanco(erro)).toContain("inalcançável");
  });

  it("aponta schema não aplicado em P2021 — o caso do banco vazio", () => {
    const erro = new Prisma.PrismaClientKnownRequestError(
      "The table `public.cer` does not exist in the current database.",
      { code: "P2021", clientVersion: "6.19.3" },
    );

    expect(causaDaFalhaDeBanco(erro)).toContain("migrate deploy");
  });

  it("não vaza a mensagem crua do Prisma (traz host e usuário da conexão)", () => {
    const erro = new Prisma.PrismaClientInitializationError(
      "Can't reach database server at `db.abcdefgh.supabase.co:5432`",
      "6.19.3",
      "P1001",
    );

    expect(causaDaFalhaDeBanco(erro)).not.toContain("supabase.co");
  });

  it("degrada para mensagem genérica em erro desconhecido", () => {
    expect(causaDaFalhaDeBanco(new Error("boom"))).toBe(
      "falha ao consultar o banco",
    );
  });
});
