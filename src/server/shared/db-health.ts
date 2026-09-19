import { Prisma } from "@prisma/client";

/**
 * Traduz a falha de uma query Prisma no modo de falha de deploy correspondente.
 *
 * O healthcheck é o que sobra quando as páginas só mostram "Application error:
 * a server-side exception has occurred" — sem a causa, os três modos de falha
 * (env var ausente, host inalcançável, schema não aplicado) ficam
 * indistinguíveis. Devolve texto fixo: a mensagem crua do Prisma traz host e
 * usuário da connection string, e /api/health é público.
 */
export function causaDaFalhaDeBanco(erro: unknown): string {
  if (
    erro instanceof Prisma.PrismaClientInitializationError &&
    erro.message.includes("Environment variable not found")
  ) {
    return "DATABASE_URL não definida no ambiente do app";
  }

  // KnownRequestError expõe `code`; InitializationError expõe `errorCode`.
  const codigo =
    erro instanceof Prisma.PrismaClientKnownRequestError
      ? erro.code
      : erro instanceof Prisma.PrismaClientInitializationError
        ? erro.errorCode
        : undefined;

  switch (codigo) {
    case "P1000":
      return "credenciais do banco recusadas";
    case "P1001":
      return "banco inalcançável no endereço configurado (no Supabase, use o pooler)";
    case "P1002":
      return "timeout ao conectar no banco";
    case "P1003":
      return "banco informado na DATABASE_URL não existe";
    case "P2021":
      return "schema não aplicado no banco (rode prisma migrate deploy)";
    default:
      return "falha ao consultar o banco";
  }
}
