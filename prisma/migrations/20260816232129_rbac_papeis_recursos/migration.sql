-- CreateEnum
CREATE TYPE "BasePapel" AS ENUM ('CLINICO', 'GESTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('PENDENTE', 'ATIVO', 'BLOQUEADO');

-- CreateTable
CREATE TABLE "papel" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cerId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "base" "BasePapel" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "papel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurso" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chave" CITEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "descricao" TEXT,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papel_recurso" (
    "papelId" UUID NOT NULL,
    "recursoId" UUID NOT NULL,

    CONSTRAINT "papel_recurso_pkey" PRIMARY KEY ("papelId","recursoId")
);

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN "papelId" UUID;
ALTER TABLE "usuario" ADD COLUMN "status" "StatusUsuario" NOT NULL DEFAULT 'ATIVO';

-- Backfill: cria papel base por valor distinto do enum antigo (CER piloto) e associa usuários existentes.
-- DB fresco (CI: migrate → seed): sem linhas, bloco não cria nada; seed cria a matriz completa.
DO $$
DECLARE cer_piloto uuid := '00000000-0000-4000-8000-000000000001';
BEGIN
  INSERT INTO "papel" ("id", "cerId", "nome", "base")
  SELECT gen_random_uuid(), cer_piloto, u.papel_valor,
         CASE u.papel_valor
           WHEN 'ADMIN'  THEN 'ADMIN'::"BasePapel"
           WHEN 'GESTOR' THEN 'GESTOR'::"BasePapel"
           ELSE 'CLINICO'::"BasePapel"
         END
  FROM (SELECT DISTINCT papel::text AS papel_valor FROM "usuario") u
  ON CONFLICT DO NOTHING;

  UPDATE "usuario" u
  SET "papelId" = p.id
  FROM "papel" p
  WHERE p."cerId" = u."cerId"
    AND p.nome = u.papel::text;
END $$;

-- DropColumn (enum antigo)
ALTER TABLE "usuario" DROP COLUMN "papel";

-- DropEnum
DROP TYPE "Papel";

-- SetNotNull + FKs + índices
ALTER TABLE "usuario" ALTER COLUMN "papelId" SET NOT NULL;

CREATE UNIQUE INDEX "papel_cerId_nome_key" ON "papel"("cerId", "nome");
CREATE UNIQUE INDEX "recurso_chave_key" ON "recurso"("chave");
CREATE INDEX "papel_recurso_recursoId_idx" ON "papel_recurso"("recursoId");
CREATE INDEX "papel_recurso_papelId_idx" ON "papel_recurso"("papelId");

ALTER TABLE "papel" ADD CONSTRAINT "papel_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "papel_recurso" ADD CONSTRAINT "papel_recurso_papelId_fkey" FOREIGN KEY ("papelId") REFERENCES "papel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "papel_recurso" ADD CONSTRAINT "papel_recurso_recursoId_fkey" FOREIGN KEY ("recursoId") REFERENCES "recurso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_papelId_fkey" FOREIGN KEY ("papelId") REFERENCES "papel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;