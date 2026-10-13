-- CreateEnum
CREATE TYPE "ActorTipo" AS ENUM ('USUARIO', 'CIDADAO', 'SISTEMA');

-- AlterTable
ALTER TABLE "auditoria" ADD COLUMN     "actorPacienteId" UUID,
ADD COLUMN     "actorTipo" "ActorTipo" NOT NULL DEFAULT 'USUARIO',
ALTER COLUMN "actorId" DROP NOT NULL;

-- exatamente um ator por linha (ADR-0012): USUARIO com FK de usuario,
-- CIDADAO com FK de paciente, SISTEMA sem ator humano.
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_actor_check" CHECK (
    ("actorTipo" = 'USUARIO' AND "actorId" IS NOT NULL AND "actorPacienteId" IS NULL)
    OR ("actorTipo" = 'CIDADAO' AND "actorPacienteId" IS NOT NULL AND "actorId" IS NULL)
    OR ("actorTipo" = 'SISTEMA' AND "actorId" IS NULL AND "actorPacienteId" IS NULL)
);

-- CreateTable
CREATE TABLE "acesso_cidadao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pacienteId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "emitidoPorId" UUID NOT NULL,
    "emitidoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validoAte" TIMESTAMPTZ(3) NOT NULL,
    "usadoEm" TIMESTAMPTZ(3),
    "revogadoEm" TIMESTAMPTZ(3),
    "revogadoPorId" UUID,

    CONSTRAINT "acesso_cidadao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acesso_cidadao_tokenHash_key" ON "acesso_cidadao"("tokenHash");

-- CreateIndex
CREATE INDEX "acesso_cidadao_pacienteId_idx" ON "acesso_cidadao"("pacienteId");

-- AddForeignKey
ALTER TABLE "acesso_cidadao" ADD CONSTRAINT "acesso_cidadao_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acesso_cidadao" ADD CONSTRAINT "acesso_cidadao_emitidoPorId_fkey" FOREIGN KEY ("emitidoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acesso_cidadao" ADD CONSTRAINT "acesso_cidadao_revogadoPorId_fkey" FOREIGN KEY ("revogadoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_actorPacienteId_fkey" FOREIGN KEY ("actorPacienteId") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
