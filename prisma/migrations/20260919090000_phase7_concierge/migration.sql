-- Additive extension of the existing Phase 4 conversation placeholders.
ALTER TABLE "AiConversationReady" ADD COLUMN "guestHash" TEXT,
 ADD COLUMN "title" TEXT NOT NULL DEFAULT 'A new conversation',
 ADD COLUMN "preferences" JSONB, ADD COLUMN "deletedAt" TIMESTAMP(3),
 ADD COLUMN "busyUntil" TIMESTAMP(3), ADD COLUMN "turnCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiMessageReady" ADD COLUMN "references" JSONB;
CREATE INDEX "AiConversationReady_customerId_updated_at_idx" ON "AiConversationReady"("customerId", "updated_at");
CREATE INDEX "AiConversationReady_guestHash_updated_at_idx" ON "AiConversationReady"("guestHash", "updated_at");
CREATE INDEX "AiMessageReady_conversationId_created_at_idx" ON "AiMessageReady"("conversationId", "created_at");
CREATE TABLE "AiUsageWindow" ("principal" TEXT NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "count" INTEGER NOT NULL DEFAULT 0, CONSTRAINT "AiUsageWindow_pkey" PRIMARY KEY ("principal"));
ALTER TABLE "AiConversationReady" ADD CONSTRAINT "AiConversationReady_single_owner" CHECK ("customerId" IS NULL OR "guestHash" IS NULL);
ALTER TABLE "AiConversationReady" ADD CONSTRAINT "AiConversationReady_turn_bound" CHECK ("turnCount" >= 0 AND "turnCount" <= 30);
