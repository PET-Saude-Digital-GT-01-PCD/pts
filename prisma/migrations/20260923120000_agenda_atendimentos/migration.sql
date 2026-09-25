CREATE TYPE "StatusAgendamento" AS ENUM (
  'AGENDADO',
  'REALIZADO',
  'FALTA',
  'CANCELADO',
  'REMARCADO'
);

CREATE TABLE "agendamento" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ptsId" UUID NOT NULL,
  "profissionalId" UUID NOT NULL,
  "criadoPorId" UUID NOT NULL,
  "inicioEm" TIMESTAMPTZ(3) NOT NULL,
  "fimEm" TIMESTAMPTZ(3) NOT NULL,
  "status" "StatusAgendamento" NOT NULL DEFAULT 'AGENDADO',
  "observacao" VARCHAR(500),
  "remarcadoDeId" UUID,
  "eventoCuidadoId" UUID,
  "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agendamento_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agendamento_horario_valido" CHECK ("fimEm" > "inicioEm"),
  CONSTRAINT "agendamento_ptsId_fkey" FOREIGN KEY ("ptsId") REFERENCES "pts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "agendamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "agendamento_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "agendamento_remarcadoDeId_fkey" FOREIGN KEY ("remarcadoDeId") REFERENCES "agendamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "agendamento_eventoCuidadoId_fkey" FOREIGN KEY ("eventoCuidadoId") REFERENCES "evento_cuidado"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "agendamento_remarcadoDeId_key" ON "agendamento"("remarcadoDeId");
CREATE UNIQUE INDEX "agendamento_eventoCuidadoId_key" ON "agendamento"("eventoCuidadoId");
CREATE INDEX "agendamento_profissionalId_inicioEm_status_idx" ON "agendamento"("profissionalId", "inicioEm", "status");
CREATE INDEX "agendamento_ptsId_inicioEm_status_idx" ON "agendamento"("ptsId", "inicioEm", "status");
