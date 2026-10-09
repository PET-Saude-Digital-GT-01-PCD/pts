import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 exige driver adapter no runtime (sem engine Rust embutida).
// DATABASE_URL segue sendo a pooled (pgbouncer) em stage/prod e direta no
// local/CI. Sem env (ex.: `next build` no Dockerfile), constrói sem URL —
// a conexão só acontece na primeira query.
const adapter = new PrismaPg(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {},
);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
