-- CreateTable
CREATE TABLE "PricingConfigHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "baseRatePerKm" REAL NOT NULL,
    "adjustmentPercent" REAL NOT NULL,
    "updatedByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingConfigHistory_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
