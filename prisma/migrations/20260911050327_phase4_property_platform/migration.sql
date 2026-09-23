-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PRE_LAUNCH', 'NEW_LAUNCH', 'UNDER_CONSTRUCTION', 'READY_TO_MOVE', 'SOLD_OUT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'VILLA', 'PENTHOUSE');

-- CreateEnum
CREATE TYPE "UnitAvailability" AS ENUM ('AVAILABLE', 'HOLD', 'RESERVED', 'BOOKED', 'SOLD', 'NOT_RELEASED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('HERO', 'GALLERY', 'VIDEO', 'FLOOR_PLAN', 'MASTER_PLAN', 'BROCHURE', 'EXTERIOR', 'INTERIOR', 'AMENITY');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "NearbyCategory" AS ENUM ('AIRPORT', 'IT_HUB', 'SCHOOL', 'HOSPITAL', 'MALL', 'BEACH', 'METRO', 'HIGHWAY', 'RAILWAY_STATION', 'BUSINESS_DISTRICT');

-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('PROJECT_VIEWED', 'UNIT_VIEWED', 'FILTER_USED', 'SEARCH_PERFORMED', 'SCHEDULE_VISIT_STARTED', 'SCHEDULE_VISIT_SUBMITTED', 'ENQUIRY_SUBMITTED', 'BROCHURE_CLICKED', 'AI_ASSISTANT_OPENED');

-- CreateTable
CREATE TABLE "Developer" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "establishedYear" INTEGER,
    "city" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Developer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "postalCode" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "legacyId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'UNDER_CONSTRUCTION',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "launchDate" DATE,
    "possessionDate" DATE,
    "reraReadyReference" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "deletedAt" TIMESTAMP(3),
    "developerId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMedia" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "alt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tower" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "totalFloors" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" UUID NOT NULL,
    "towerId" UUID NOT NULL,
    "floorNumber" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitType" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bedrooms" DECIMAL(3,1) NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "balconies" INTEGER NOT NULL,
    "minArea" INTEGER NOT NULL,
    "maxArea" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "floorPlanMediaId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "towerId" UUID NOT NULL,
    "floorId" UUID NOT NULL,
    "unitTypeId" UUID NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "orientation" TEXT NOT NULL,
    "builtUpAreaSqft" INTEGER NOT NULL,
    "carpetAreaSqft" INTEGER NOT NULL,
    "basePrice" DECIMAL(14,2) NOT NULL,
    "currentPrice" DECIMAL(14,2) NOT NULL,
    "availability" "UnitAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitPriceHistory" (
    "id" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "oldPrice" DECIMAL(14,2),
    "newPrice" DECIMAL(14,2) NOT NULL,
    "changeReason" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitStatusHistory" (
    "id" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "oldStatus" "UnitAvailability",
    "newStatus" "UnitAvailability" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectStatusHistory" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "oldStatus" "ProjectStatus",
    "newStatus" "ProjectStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Amenity" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Amenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAmenity" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "amenityId" UUID NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NearbyPlace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "NearbyCategory" NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NearbyPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectNearbyPlace" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "nearbyPlaceId" UUID NOT NULL,
    "distanceKm" DECIMAL(6,2) NOT NULL,
    "estimatedTravelMinutes" INTEGER,
    "isIllustrative" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectNearbyPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "deletedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerRequirement" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "city" TEXT,
    "budgetMin" DECIMAL(14,2),
    "budgetMax" DECIMAL(14,2),
    "bedrooms" DECIMAL(3,1),
    "filters" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficSource" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "budgetMin" DECIMAL(14,2),
    "budgetMax" DECIMAL(14,2),
    "preferredLocation" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "projectId" UUID NOT NULL,
    "unitId" UUID,
    "sourceId" UUID NOT NULL,
    "customerId" UUID,
    "agentId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStatusHistory" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "oldStatus" "LeadStatus",
    "newStatus" "LeadStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadNote" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "leadId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "unitId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "preferredDate" DATE NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "status" "VisitStatus" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisitStatusHistory" (
    "id" UUID NOT NULL,
    "siteVisitId" UUID NOT NULL,
    "oldStatus" "VisitStatus",
    "newStatus" "VisitStatus" NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVisitStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "leadId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrochureDownload" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "leadId" UUID,
    "trafficSourceId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrochureDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserEvent" (
    "id" UUID NOT NULL,
    "eventKey" UUID NOT NULL,
    "kind" "EventKind" NOT NULL,
    "projectId" UUID,
    "unitId" UUID,
    "trafficSourceId" UUID,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyView" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversionEvent" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteReady" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FavoriteReady_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearchReady" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearchReady_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationReady" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationReady_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogReady" (
    "id" UUID NOT NULL,
    "actorReference" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuditLogReady_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversationReady" (
    "id" UUID NOT NULL,
    "customerId" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversationReady_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessageReady" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiMessageReady_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Developer_slug_key" ON "Developer"("slug");

-- CreateIndex
CREATE INDEX "Location_city_idx" ON "Location"("city");

-- CreateIndex
CREATE INDEX "Location_locality_idx" ON "Location"("locality");

-- CreateIndex
CREATE UNIQUE INDEX "Location_city_locality_key" ON "Location"("city", "locality");

-- CreateIndex
CREATE UNIQUE INDEX "Project_legacyId_key" ON "Project"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE INDEX "Project_status_featured_sortOrder_idx" ON "Project"("status", "featured", "sortOrder");

-- CreateIndex
CREATE INDEX "Project_developerId_idx" ON "Project"("developerId");

-- CreateIndex
CREATE INDEX "Project_locationId_idx" ON "Project"("locationId");

-- CreateIndex
CREATE INDEX "Project_possessionDate_idx" ON "Project"("possessionDate");

-- CreateIndex
CREATE INDEX "ProjectMedia_projectId_type_sortOrder_idx" ON "ProjectMedia"("projectId", "type", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Tower_projectId_code_key" ON "Tower"("projectId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Tower_id_projectId_key" ON "Tower"("id", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_towerId_floorNumber_key" ON "Floor"("towerId", "floorNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_id_towerId_key" ON "Floor"("id", "towerId");

-- CreateIndex
CREATE INDEX "UnitType_bedrooms_idx" ON "UnitType"("bedrooms");

-- CreateIndex
CREATE UNIQUE INDEX "UnitType_projectId_name_key" ON "UnitType"("projectId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UnitType_id_projectId_key" ON "UnitType"("id", "projectId");

-- CreateIndex
CREATE INDEX "Unit_projectId_availability_currentPrice_idx" ON "Unit"("projectId", "availability", "currentPrice");

-- CreateIndex
CREATE INDEX "Unit_currentPrice_idx" ON "Unit"("currentPrice");

-- CreateIndex
CREATE INDEX "Unit_builtUpAreaSqft_idx" ON "Unit"("builtUpAreaSqft");

-- CreateIndex
CREATE INDEX "Unit_unitTypeId_idx" ON "Unit"("unitTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_towerId_unitNumber_key" ON "Unit"("towerId", "unitNumber");

-- CreateIndex
CREATE INDEX "UnitPriceHistory_unitId_effectiveFrom_idx" ON "UnitPriceHistory"("unitId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "UnitStatusHistory_unitId_created_at_idx" ON "UnitStatusHistory"("unitId", "created_at");

-- CreateIndex
CREATE INDEX "ProjectStatusHistory_projectId_created_at_idx" ON "ProjectStatusHistory"("projectId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_name_key" ON "Amenity"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_slug_key" ON "Amenity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAmenity_projectId_amenityId_key" ON "ProjectAmenity"("projectId", "amenityId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectNearbyPlace_projectId_nearbyPlaceId_key" ON "ProjectNearbyPlace"("projectId", "nearbyPlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_code_key" ON "LeadSource"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficSource_code_key" ON "TrafficSource"("code");

-- CreateIndex
CREATE INDEX "Lead_projectId_email_created_at_idx" ON "Lead"("projectId", "email", "created_at");

-- CreateIndex
CREATE INDEX "Lead_projectId_phone_created_at_idx" ON "Lead"("projectId", "phone", "created_at");

-- CreateIndex
CREATE INDEX "Lead_status_created_at_idx" ON "Lead"("status", "created_at");

-- CreateIndex
CREATE INDEX "LeadStatusHistory_leadId_created_at_idx" ON "LeadStatusHistory"("leadId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisit_idempotencyKey_key" ON "SiteVisit"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SiteVisit_projectId_preferredDate_idx" ON "SiteVisit"("projectId", "preferredDate");

-- CreateIndex
CREATE INDEX "SiteVisit_leadId_idx" ON "SiteVisit"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_idempotencyKey_key" ON "Enquiry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Enquiry_projectId_created_at_idx" ON "Enquiry"("projectId", "created_at");

-- CreateIndex
CREATE INDEX "Enquiry_leadId_idx" ON "Enquiry"("leadId");

-- CreateIndex
CREATE INDEX "BrochureDownload_projectId_created_at_idx" ON "BrochureDownload"("projectId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "UserEvent_eventKey_key" ON "UserEvent"("eventKey");

-- CreateIndex
CREATE INDEX "UserEvent_kind_created_at_idx" ON "UserEvent"("kind", "created_at");

-- CreateIndex
CREATE INDEX "UserEvent_projectId_created_at_idx" ON "UserEvent"("projectId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyView_eventId_key" ON "PropertyView"("eventId");

-- CreateIndex
CREATE INDEX "PropertyView_projectId_created_at_idx" ON "PropertyView"("projectId", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "ConversionEvent_eventId_key" ON "ConversionEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteReady_customerId_projectId_key" ON "FavoriteReady"("customerId", "projectId");

-- CreateIndex
CREATE INDEX "AuditLogReady_entityType_entityId_idx" ON "AuditLogReady"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "Developer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMedia" ADD CONSTRAINT "ProjectMedia_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tower" ADD CONSTRAINT "Tower_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_towerId_fkey" FOREIGN KEY ("towerId") REFERENCES "Tower"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitType" ADD CONSTRAINT "UnitType_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitType" ADD CONSTRAINT "UnitType_floorPlanMediaId_fkey" FOREIGN KEY ("floorPlanMediaId") REFERENCES "ProjectMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_towerId_projectId_fkey" FOREIGN KEY ("towerId", "projectId") REFERENCES "Tower"("id", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_floorId_towerId_fkey" FOREIGN KEY ("floorId", "towerId") REFERENCES "Floor"("id", "towerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_unitTypeId_projectId_fkey" FOREIGN KEY ("unitTypeId", "projectId") REFERENCES "UnitType"("id", "projectId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitPriceHistory" ADD CONSTRAINT "UnitPriceHistory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitStatusHistory" ADD CONSTRAINT "UnitStatusHistory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStatusHistory" ADD CONSTRAINT "ProjectStatusHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAmenity" ADD CONSTRAINT "ProjectAmenity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAmenity" ADD CONSTRAINT "ProjectAmenity_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "Amenity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNearbyPlace" ADD CONSTRAINT "ProjectNearbyPlace_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectNearbyPlace" ADD CONSTRAINT "ProjectNearbyPlace_nearbyPlaceId_fkey" FOREIGN KEY ("nearbyPlaceId") REFERENCES "NearbyPlace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerRequirement" ADD CONSTRAINT "CustomerRequirement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisitStatusHistory" ADD CONSTRAINT "SiteVisitStatusHistory_siteVisitId_fkey" FOREIGN KEY ("siteVisitId") REFERENCES "SiteVisit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrochureDownload" ADD CONSTRAINT "BrochureDownload_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrochureDownload" ADD CONSTRAINT "BrochureDownload_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrochureDownload" ADD CONSTRAINT "BrochureDownload_trafficSourceId_fkey" FOREIGN KEY ("trafficSourceId") REFERENCES "TrafficSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserEvent" ADD CONSTRAINT "UserEvent_trafficSourceId_fkey" FOREIGN KEY ("trafficSourceId") REFERENCES "TrafficSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "UserEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "UserEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversionEvent" ADD CONSTRAINT "ConversionEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteReady" ADD CONSTRAINT "FavoriteReady_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteReady" ADD CONSTRAINT "FavoriteReady_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearchReady" ADD CONSTRAINT "SavedSearchReady_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationReady" ADD CONSTRAINT "NotificationReady_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversationReady" ADD CONSTRAINT "AiConversationReady_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessageReady" ADD CONSTRAINT "AiMessageReady_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversationReady"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business invariants remain enforced independently of application validation.
ALTER TABLE "Unit" ADD CONSTRAINT "unit_positive_price_area" CHECK ("currentPrice" >= 0 AND "basePrice" >= 0 AND "builtUpAreaSqft" > 0 AND "carpetAreaSqft" > 0 AND "carpetAreaSqft" <= "builtUpAreaSqft");
ALTER TABLE "UnitType" ADD CONSTRAINT "unit_type_ranges" CHECK ("minArea" > 0 AND "maxArea" >= "minArea" AND bedrooms > 0);
ALTER TABLE "SiteVisit" ADD CONSTRAINT "visit_guest_count" CHECK ("guestCount" BETWEEN 1 AND 10);
ALTER TABLE "ProjectNearbyPlace" ADD CONSTRAINT "nearby_positive_distance" CHECK ("distanceKm" >= 0);