-- CreateEnum
CREATE TYPE "CommunicationMode" AS ENUM ('AI_ASSISTED', 'HUMAN', 'PAUSED');

-- CreateEnum
CREATE TYPE "WhatsAppConsent" AS ENUM ('UNKNOWN', 'OPTED_IN', 'OPTED_OUT');

-- CreateEnum
CREATE TYPE "WhatsAppDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('RECEIVED', 'QUEUED', 'SUBMITTING', 'ACCEPTED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'UNCERTAIN');

-- CreateTable
CREATE TABLE "WhatsAppContact" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "displayName" TEXT,
    "customerId" UUID,
    "consent" "WhatsAppConsent" NOT NULL DEFAULT 'UNKNOWN',
    "consentAt" TIMESTAMP(3),
    "consentSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppConversation" (
    "id" UUID NOT NULL,
    "contactId" UUID NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "mode" "CommunicationMode" NOT NULL DEFAULT 'HUMAN',
    "agentId" UUID,
    "leadId" UUID,
    "enquiryId" UUID,
    "visitId" UUID,
    "projectId" UUID,
    "unitId" UUID,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastInboundAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handoffAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "preferences" JSONB,
    "aiDraft" TEXT,
    "aiReferences" JSONB,
    "aiLeaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "providerMessageId" TEXT,
    "idempotencyKey" UUID,
    "payloadHash" TEXT,
    "direction" "WhatsAppDirection" NOT NULL,
    "type" TEXT NOT NULL,
    "status" "WhatsAppStatus" NOT NULL,
    "body" TEXT,
    "templateName" TEXT,
    "templateLanguage" TEXT,
    "templateParameters" JSONB,
    "sender" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "staffId" UUID,
    "errorCode" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "providerAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppStatusHistory" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "status" "WhatsAppStatus" NOT NULL,
    "eventKey" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppWebhookEvent" (
    "id" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "recipient" TEXT,
    "callbackId" UUID,
    "kind" TEXT NOT NULL,
    "status" "WhatsAppStatus",
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parameterCount" INTEGER NOT NULL,
    "supported" BOOLEAN NOT NULL DEFAULT false,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppContact_phone_key" ON "WhatsAppContact"("phone");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_agentId_lastActivityAt_idx" ON "WhatsAppConversation"("agentId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_mode_lastActivityAt_idx" ON "WhatsAppConversation"("mode", "lastActivityAt");

-- CreateIndex
CREATE INDEX "WhatsAppConversation_leadId_idx" ON "WhatsAppConversation"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConversation_contactId_phoneNumberId_key" ON "WhatsAppConversation"("contactId", "phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_providerMessageId_key" ON "WhatsAppMessage"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_idempotencyKey_key" ON "WhatsAppMessage"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_conversationId_createdAt_idx" ON "WhatsAppMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_status_createdAt_idx" ON "WhatsAppMessage"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppStatusHistory_eventKey_key" ON "WhatsAppStatusHistory"("eventKey");

-- CreateIndex
CREATE INDEX "WhatsAppStatusHistory_messageId_occurredAt_idx" ON "WhatsAppStatusHistory"("messageId", "occurredAt");

-- CreateIndex
CREATE INDEX "WhatsAppWebhookEvent_providerMessageId_applied_idx" ON "WhatsAppWebhookEvent"("providerMessageId", "applied");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppTemplate_name_language_key" ON "WhatsAppTemplate"("name", "language");

-- AddForeignKey
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsAppContact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "SiteVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppStatusHistory" ADD CONSTRAINT "WhatsAppStatusHistory_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "WhatsAppMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Phase 8 invariants: existing schemas and rows are untouched.
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "whatsapp_canonical_india_phone" CHECK (phone ~ '^\+91[6-9][0-9]{9}$');
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "whatsapp_nonnegative_counters" CHECK ("unreadCount" >= 0 AND version >= 0);
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "whatsapp_attempt_bound" CHECK (attempts BETWEEN 0 AND 1);
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "whatsapp_text_bound" CHECK (body IS NULL OR length(body) <= 2000);
CREATE TRIGGER aurelia_whatsapp_history_append_only BEFORE UPDATE OR DELETE ON "WhatsAppStatusHistory" FOR EACH ROW EXECUTE FUNCTION aurelia_audit_append_only();
