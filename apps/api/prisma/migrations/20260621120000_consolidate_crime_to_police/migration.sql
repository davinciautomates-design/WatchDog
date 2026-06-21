-- Consolidate CRIME category into POLICE.
-- PostgreSQL cannot drop an enum value in-place; the standard approach is to
-- rename the old type, create a new one without the removed value, migrate the
-- columns, then drop the old type.

-- Step 1: migrate existing rows so no CRIME values remain
UPDATE "events"  SET "category" = 'POLICE' WHERE "category" = 'CRIME';
UPDATE "reports" SET "category" = 'POLICE' WHERE "category" = 'CRIME';

-- Step 2: swap enum type
ALTER TYPE "Category" RENAME TO "Category_old";
CREATE TYPE "Category" AS ENUM ('POLICE', 'FIRE', 'AMBULANCE', 'ROAD', 'DISTURBANCE', 'SAFETY', 'COMMUNITY');

ALTER TABLE "events"  ALTER COLUMN "category" TYPE "Category" USING "category"::text::"Category";
ALTER TABLE "reports" ALTER COLUMN "category" TYPE "Category" USING "category"::text::"Category";

DROP TYPE "Category_old";
