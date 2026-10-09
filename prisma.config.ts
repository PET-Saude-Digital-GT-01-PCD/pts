import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: URLs de conexão saíram do schema.prisma e vivem aqui.
// - `generate` não precisa de banco (tolerar ausente: Dockerfile/Vercel geram sem env).
// - `migrate deploy`/`db seed` usam conexão direta: DIRECT_URL quando definida,
//   senão DATABASE_URL (CI, db-migrate.yml e compose injetam a direta nas duas).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
