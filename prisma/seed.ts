import bcrypt from "bcryptjs";
import { loadEnvFile } from "node:process";
import { PrismaClient } from "@prisma/client";

// tsx não carrega .env (só o CLI do Prisma carrega). Carregar quando presente.
try {
  loadEnvFile();
} catch {
  // .env ausente (ex.: CI injeta as variáveis diretamente)
}

const prisma = new PrismaClient();

// Senha padrão apenas para dev/piloto — sobrescrever com SEED_ADMIN_SENHA.
const SENHA_ADMIN = process.env.SEED_ADMIN_SENHA ?? "admin123";

async function main() {
  const cer = await prisma.cer.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      nome: "CER Piloto",
      municipio: "Recife",
      escopos: ["FISICA", "INTELECTUAL"],
    },
  });

  const senhaHash = await bcrypt.hash(SENHA_ADMIN, 10);

  await prisma.usuario.upsert({
    where: { email: "admin@pts.local" },
    update: { senhaHash },
    create: {
      email: "admin@pts.local",
      senhaHash,
      nome: "Administrador",
      categoria: "ENFERMEIRO",
      papel: "ADMIN",
      cerId: cer.id,
    },
  });

  console.log("Seed ok: CER + usuário admin criados (papel ADMIN).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());