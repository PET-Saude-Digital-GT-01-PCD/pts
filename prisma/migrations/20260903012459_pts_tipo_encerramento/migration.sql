-- CreateEnum
CREATE TYPE "TipoEncerramento" AS ENUM ('ALTA', 'CONTRARREFERENCIA', 'DESCONTINUACAO');

-- AlterTable
ALTER TABLE "pts" ADD COLUMN     "tipoEncerramento" "TipoEncerramento";
