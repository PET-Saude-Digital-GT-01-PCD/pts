-- CreateTable
CREATE TABLE "org_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cerId" UUID NOT NULL,
    "nomeExibido" TEXT,
    "logoUrl" TEXT,
    "parceirosJson" JSONB,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_config_cerId_key" ON "org_config"("cerId");

-- AddForeignKey
ALTER TABLE "org_config" ADD CONSTRAINT "org_config_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
