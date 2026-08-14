import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ponytail: hash placeholder — auth (passo 2, contexto iam) substitui por Argon2/bcrypt
const SENHA_HASH_PLACEHOLDER =
  "$placeholder$alterar-no-contexto-iam";

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

  await prisma.usuario.upsert({
    where: { email: "admin@pts.local" },
    update: {},
    create: {
      email: "admin@pts.local",
      senhaHash: SENHA_HASH_PLACEHOLDER,
      nome: "Administrador",
      categoria: "ENFERMEIRO",
      papel: "ADMIN",
      cerId: cer.id,
    },
  });

  console.log("Seed ok: CER + usuário admin criados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());