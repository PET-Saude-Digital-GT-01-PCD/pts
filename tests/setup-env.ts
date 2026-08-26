import { loadEnvFile } from "node:process";

// tsx não carrega .env (só o CLI do Prisma carrega). Vitest idem — carregar quando presente.
// No CI as variáveis são injetadas pelo workflow.
try {
  loadEnvFile();
} catch {
  // .env ausente
}
