-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "routeGeometry" JSONB;

-- AlterTable
ALTER TABLE "Ride" ADD COLUMN "routeGeometry" JSONB;
