BEGIN;
-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT', 'VIEWER');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadStatus" ADD VALUE 'VISIT_REQUESTED';
ALTER TYPE "LeadStatus" ADD VALUE 'VISIT_SCHEDULED';

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UnitPriceHistory" ADD COLUMN     "actorReference" TEXT;

-- AlterTable
ALTER TABLE "UnitStatusHistory" ADD COLUMN     "actorReference" TEXT;

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "customerId" UUID,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "role" "StaffRole" NOT NULL DEFAULT 'VIEWER',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LeadStatusHistory" ADD COLUMN     "actorReference" TEXT;

-- AlterTable
ALTER TABLE "LeadNote" ADD COLUMN     "authorId" UUID;

-- AlterTable
ALTER TABLE "SiteVisit" ADD COLUMN     "scheduledDate" DATE,
ADD COLUMN     "scheduledTime" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SiteVisitStatusHistory" ADD COLUMN     "actorReference" TEXT,
ADD COLUMN     "previousDate" DATE,
ADD COLUMN     "previousTime" TEXT,
ADD COLUMN     "scheduledDate" DATE,
ADD COLUMN     "scheduledTime" TEXT;

-- AlterTable
ALTER TABLE "Enquiry" ADD COLUMN     "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "leadId" UUID NOT NULL,
    "customerId" UUID,
    "agentId" UUID NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnquiryStatusHistory" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "oldStatus" "EnquiryStatus",
    "newStatus" "EnquiryStatus" NOT NULL,
    "actorReference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_agentId_status_dueAt_idx" ON "FollowUp"("agentId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUp_leadId_dueAt_idx" ON "FollowUp"("leadId", "dueAt");

-- CreateIndex
CREATE INDEX "EnquiryStatusHistory_enquiryId_created_at_idx" ON "EnquiryStatusHistory"("enquiryId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_customerId_key" ON "Agent"("customerId");

-- CreateIndex
CREATE INDEX "Lead_agentId_status_idx" ON "Lead"("agentId", "status");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnquiryStatusHistory" ADD CONSTRAINT "EnquiryStatusHistory_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


INSERT INTO "LeadSource" (id,code,label,updated_at) VALUES
(gen_random_uuid(),'WEBSITE','Website',now()),(gen_random_uuid(),'DIRECT','Direct introduction',now()),(gen_random_uuid(),'REFERRAL','Referral',now()),(gen_random_uuid(),'OTHER','Other',now()) ON CONFLICT (code) DO NOTHING;
CREATE FUNCTION aurelia_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit records are append-only'; END $$;
CREATE TRIGGER aurelia_audit_append_only BEFORE UPDATE OR DELETE ON "AuditLogReady" FOR EACH ROW EXECUTE FUNCTION aurelia_audit_append_only();
COMMIT;
