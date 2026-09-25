-- CreateTable
CREATE TABLE "acesso_cidadao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ptsId" UUID NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "criadoPorId" UUID NOT NULL,
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEm" TIMESTAMPTZ(3) NOT NULL,
    "revogadoEm" TIMESTAMPTZ(3),
    "ultimoAcessoEm" TIMESTAMPTZ(3),
    "totalAcessos" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "acesso_cidadao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acesso_cidadao_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "acessoCidadaoId" UUID NOT NULL,
    "acessadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acesso_cidadao_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "acesso_cidadao_codigoHash_key" ON "acesso_cidadao"("codigoHash");

-- CreateIndex
CREATE INDEX "acesso_cidadao_ptsId_idx" ON "acesso_cidadao"("ptsId");

-- CreateIndex
CREATE INDEX "acesso_cidadao_criadoPorId_idx" ON "acesso_cidadao"("criadoPorId");

-- CreateIndex
CREATE INDEX "acesso_cidadao_log_acessoCidadaoId_acessadoEm_idx" ON "acesso_cidadao_log"("acessoCidadaoId", "acessadoEm");

-- AddForeignKey
ALTER TABLE "acesso_cidadao" ADD CONSTRAINT "acesso_cidadao_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acesso_cidadao" ADD CONSTRAINT "acesso_cidadao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acesso_cidadao_log" ADD CONSTRAINT "acesso_cidadao_log_acessoCidadaoId_fkey" FOREIGN KEY ("acessoCidadaoId") REFERENCES "acesso_cidadao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
