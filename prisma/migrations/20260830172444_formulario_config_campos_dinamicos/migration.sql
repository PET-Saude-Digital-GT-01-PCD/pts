-- CreateEnum
CREATE TYPE "TipoCampo" AS ENUM ('TEXTO', 'NUMERO', 'SELECAO', 'BOOLEAN', 'DATA');

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "camposDinamicosJson" JSONB,
ALTER COLUMN "categoria" DROP NOT NULL;

-- CreateTable
CREATE TABLE "formulario_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cerId" UUID NOT NULL,
    "entidade" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "tipo" "TipoCampo" NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "opcoesJson" JSONB,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formulario_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "formulario_config_cerId_entidade_visivel_idx" ON "formulario_config"("cerId", "entidade", "visivel");

-- CreateIndex
CREATE UNIQUE INDEX "formulario_config_cerId_entidade_campo_key" ON "formulario_config"("cerId", "entidade", "campo");

-- AddForeignKey
ALTER TABLE "formulario_config" ADD CONSTRAINT "formulario_config_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
