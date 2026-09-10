-- CreateEnum
CREATE TYPE "TipoCampoFormulario" AS ENUM ('TEXTO', 'NUMERO', 'SELECT', 'BOOLEANO');

-- AlterTable
ALTER TABLE "cer" ADD COLUMN     "papelAutocadastroId" UUID;

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "camposDinamicosJson" JSONB;

-- CreateTable
CREATE TABLE "formulario_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cerId" UUID NOT NULL,
    "entidade" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "tipo" "TipoCampoFormulario" NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "visivel" BOOLEAN NOT NULL DEFAULT true,
    "opcoesJson" JSONB,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formulario_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "formulario_config_cerId_entidade_campo_key" ON "formulario_config"("cerId", "entidade", "campo");

-- AddForeignKey
ALTER TABLE "cer" ADD CONSTRAINT "cer_papelAutocadastroId_fkey" FOREIGN KEY ("papelAutocadastroId") REFERENCES "papel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formulario_config" ADD CONSTRAINT "formulario_config_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
