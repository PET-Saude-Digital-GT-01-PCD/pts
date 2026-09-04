-- CreateEnum
CREATE TYPE "TipoOutboundEvent" AS ENUM ('MARKER_ESUS', 'REFERRAL', 'NOTIFICACAO');

-- CreateEnum
CREATE TYPE "StatusOutboundEvent" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "outbound_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tipo" "TipoOutboundEvent" NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "StatusOutboundEvent" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMPTZ(3),
    "criadoEm" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbound_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbound_event_status_nextRetryAt_idx" ON "outbound_event"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "outbound_event_tipo_payloadHash_status_idx" ON "outbound_event"("tipo", "payloadHash", "status");
