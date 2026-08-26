-- DropIndex
DROP INDEX "papel_recurso_papelId_idx";

-- DropIndex
DROP INDEX "papel_recurso_recursoId_idx";

-- CreateTable
CREATE TABLE "discussao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptsId" UUID NOT NULL,
    "autorId" UUID NOT NULL,
    "texto" TEXT NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discussao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discussao_ptsId_criadaEm_idx" ON "discussao"("ptsId", "criadaEm");

-- AddForeignKey
ALTER TABLE "discussao" ADD CONSTRAINT "discussao_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discussao" ADD CONSTRAINT "discussao_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
