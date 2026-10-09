import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Helper compartilhado dos specs E2E (Prisma 7 exige driver adapter).
// DATABASE_URL vem do ambiente (CI injeta; no local, exportar ou .env).
const adapter = new PrismaPg(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {},
);

export const db = new PrismaClient({ adapter });
