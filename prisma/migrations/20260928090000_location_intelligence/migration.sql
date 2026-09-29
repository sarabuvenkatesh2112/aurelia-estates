-- Additive only. Existing fictional records remain unverified and illustrative.
ALTER TYPE "NearbyCategory" ADD VALUE IF NOT EXISTS 'RESTAURANT';
ALTER TYPE "NearbyCategory" ADD VALUE IF NOT EXISTS 'PARK';
ALTER TABLE "Project"
 ADD COLUMN "publicAddress" TEXT,
 ADD COLUMN "mapLabel" TEXT,
 ADD COLUMN "latitude" DECIMAL(10,7),
 ADD COLUMN "longitude" DECIMAL(10,7),
 ADD COLUMN "locationNarrative" TEXT,
 ADD COLUMN "locationSource" TEXT,
 ADD COLUMN "locationVerifiedAt" TIMESTAMP(3),
 ADD COLUMN "locationVersion" INTEGER NOT NULL DEFAULT 0,
 ADD CONSTRAINT "Project_coordinate_pair" CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
 ADD CONSTRAINT "Project_latitude_range" CHECK ("latitude" BETWEEN -90 AND 90),
 ADD CONSTRAINT "Project_longitude_range" CHECK ("longitude" BETWEEN -180 AND 180);
ALTER TABLE "ProjectNearbyPlace"
 ADD COLUMN "sourceNote" TEXT,
 ADD COLUMN "contextNote" TEXT,
 ADD COLUMN "verifiedAt" TIMESTAMP(3);
