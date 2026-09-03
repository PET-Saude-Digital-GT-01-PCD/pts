-- AlterTable
ALTER TABLE "paciente" ADD COLUMN     "municipioOrigem" TEXT,
ADD COLUMN     "prazoRegularizacao" TIMESTAMPTZ(3),
ADD COLUMN     "provisorio" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ppi_local" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cerId" UUID NOT NULL,
    "municipioOrigem" CITEXT NOT NULL,
    "pactuado" BOOLEAN NOT NULL DEFAULT false,
    "vigenciaAte" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ppi_local_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ppi_local_cerId_municipioOrigem_key" ON "ppi_local"("cerId", "municipioOrigem");

-- AddForeignKey
ALTER TABLE "ppi_local" ADD CONSTRAINT "ppi_local_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
