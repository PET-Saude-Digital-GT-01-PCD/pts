ALTER TYPE "StatusOutboundEvent" ADD VALUE 'PROCESSING';

ALTER TABLE "outbound_event"
  ADD COLUMN "lockedUntil" TIMESTAMPTZ(3),
  ADD COLUMN "processadoEm" TIMESTAMPTZ(3);

CREATE INDEX "outbound_event_status_lockedUntil_idx"
  ON "outbound_event"("status", "lockedUntil");
