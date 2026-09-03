-- CreateTable
CREATE TABLE "contrarreferencia" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pacienteId" UUID NOT NULL,
    "ptsId" UUID,
    "motivo" TEXT NOT NULL,
    "planoCuidadosJson" JSONB,
    "destinoUbs" TEXT,
    "emitidaPorId" UUID NOT NULL,
    "criadaEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contrarreferencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contrarreferencia_pacienteId_idx" ON "contrarreferencia"("pacienteId");

-- CreateIndex
CREATE INDEX "contrarreferencia_ptsId_idx" ON "contrarreferencia"("ptsId");

-- AddForeignKey
ALTER TABLE "contrarreferencia" ADD CONSTRAINT "contrarreferencia_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrarreferencia" ADD CONSTRAINT "contrarreferencia_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrarreferencia" ADD CONSTRAINT "contrarreferencia_emitidaPorId_fkey" FOREIGN KEY ("emitidaPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
