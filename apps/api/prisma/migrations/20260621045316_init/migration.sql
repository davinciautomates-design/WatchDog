-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('OFFICIAL_API', 'GOV_DATA', 'MUNICIPAL', 'RSS', 'USER');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('POLICE', 'FIRE', 'AMBULANCE', 'ROAD', 'CRIME', 'DISTURBANCE', 'SAFETY', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'ACTIVE', 'MERGED', 'REJECTED');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "source_id" TEXT,
    "source_type" "SourceType" NOT NULL,
    "category" "Category" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "address" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),
    "raw_payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "event_id" TEXT,
    "category" "Category" NOT NULL,
    "description" TEXT NOT NULL,
    "photo_url" TEXT,
    "ip_hash" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 30,
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "verify_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upvotes" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "ip_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_source_runs" (
    "id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "event_count" INTEGER NOT NULL,
    "error" TEXT,
    "duration_ms" INTEGER NOT NULL,

    CONSTRAINT "data_source_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "events_source_id_source_type_key" ON "events"("source_id", "source_type");

-- CreateIndex
CREATE UNIQUE INDEX "upvotes_report_id_ip_hash_key" ON "upvotes"("report_id", "ip_hash");

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
