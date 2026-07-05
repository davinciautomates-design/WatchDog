/**
 * One-time PostGIS setup script.
 *
 * Run after `npm run db:migrate` to add the geography columns and indexes
 * that Prisma cannot manage natively.
 *
 * Usage: npm run db:setup-postgis
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding PostGIS geography columns...')

  await prisma.$executeRaw`ALTER TABLE events  ADD COLUMN IF NOT EXISTS location geography(Point, 4326)`
  await prisma.$executeRaw`ALTER TABLE reports ADD COLUMN IF NOT EXISTS location geography(Point, 4326)`

  console.log('Creating spatial indexes...')

  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS events_location_gist  ON events  USING GIST(location)`
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS reports_location_gist ON reports USING GIST(location)`
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS events_status_expires  ON events(status, expires_at)`
  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS reports_created_cat    ON reports(created_at, category)`

  console.log('PostGIS setup complete.')
}

main()
  .catch((err) => {
    console.error('PostGIS setup failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
