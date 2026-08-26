-- CreateEnum
CREATE TYPE "TipoEventoCuidado" AS ENUM ('SESSAO', 'FALTA', 'CANCELAMENTO', 'OUTRO');

-- CreateTable
CREATE TABLE "evento_cuidado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptsId" UUID NOT NULL,
    "tipo" "TipoEventoCuidado" NOT NULL,
    "data" TIMESTAMPTZ(3) NOT NULL,
    "observacao" TEXT,
    "registradoPorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_cuidado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evento_cuidado_ptsId_data_idx" ON "evento_cuidado"("ptsId", "data");

-- AddForeignKey
ALTER TABLE "evento_cuidado" ADD CONSTRAINT "evento_cuidado_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_cuidado" ADD CONSTRAINT "evento_cuidado_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

