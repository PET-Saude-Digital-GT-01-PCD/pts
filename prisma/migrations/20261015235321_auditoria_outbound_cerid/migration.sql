-- AlterTable
ALTER TABLE "auditoria" ADD COLUMN     "cerId" UUID;

-- AlterTable
ALTER TABLE "outbound_event" ADD COLUMN     "cerId" UUID;

-- Backfill one-time do tenant (plano/17): deriva o CER do ator humano
-- (USUARIO -> usuario.cerId) ou do cidadão (CIDADAO -> paciente.cerId).
-- Linhas SISTEMA (sem ator) permanecem NULL — leitura é fail-closed por CER.
UPDATE "auditoria" a
   SET "cerId" = u."cerId"
  FROM "usuario" u
 WHERE a."actorId" = u."id" AND a."cerId" IS NULL;

UPDATE "auditoria" a
   SET "cerId" = p."cerId"
  FROM "paciente" p
 WHERE a."actorPacienteId" = p."id" AND a."cerId" IS NULL;

-- Eventos outbound sempre nascem de uma mutação de negócio num CER: deriva do
-- paciente (ou, na ausência, do PTS) referenciado no payload.
UPDATE "outbound_event" o
   SET "cerId" = p."cerId"
  FROM "paciente" p
 WHERE o."cerId" IS NULL
   AND o."payloadJson"->>'pacienteId' ~ '^[0-9a-f-]{36}$'
   AND (o."payloadJson"->>'pacienteId')::uuid = p."id";

UPDATE "outbound_event" o
   SET "cerId" = t."cerId"
  FROM "pts" t
 WHERE o."cerId" IS NULL
   AND o."payloadJson"->>'ptsId' ~ '^[0-9a-f-]{36}$'
   AND (o."payloadJson"->>'ptsId')::uuid = t."id";

-- CreateIndex
CREATE INDEX "auditoria_cerId_criadaEm_idx" ON "auditoria"("cerId", "criadaEm");

-- CreateIndex
CREATE INDEX "outbound_event_cerId_status_idx" ON "outbound_event"("cerId", "status");

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_event" ADD CONSTRAINT "outbound_event_cerId_fkey" FOREIGN KEY ("cerId") REFERENCES "cer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
