-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "tailorId" TEXT NOT NULL,
    "garmentType" TEXT NOT NULL,
    "measurements" JSONB NOT NULL,
    "referenceImages" JSONB NOT NULL,
    "totalAmount" INTEGER NOT NULL,
    "platformFeePercent" INTEGER NOT NULL DEFAULT 10,
    "platformFeeAmount" INTEGER NOT NULL,
    "tailorPayout" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "upfrontPaid" BOOLEAN NOT NULL DEFAULT false,
    "finalPaid" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PICKUP',
    "pickupAddress" JSONB NOT NULL,
    "deliveryAddress" JSONB NOT NULL,
    "tailorAddress" JSONB NOT NULL DEFAULT '{}',
    "checkoutKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("checkoutKey", "createdAt", "currency", "customerId", "deliveryAddress", "finalPaid", "garmentType", "id", "measurements", "pickupAddress", "platformFeeAmount", "platformFeePercent", "referenceImages", "status", "tailorId", "tailorPayout", "totalAmount", "updatedAt", "upfrontPaid") SELECT "checkoutKey", "createdAt", "currency", "customerId", "deliveryAddress", "finalPaid", "garmentType", "id", "measurements", "pickupAddress", "platformFeeAmount", "platformFeePercent", "referenceImages", "status", "tailorId", "tailorPayout", "totalAmount", "updatedAt", "upfrontPaid" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");
CREATE INDEX "Order_tailorId_status_idx" ON "Order"("tailorId", "status");
CREATE TABLE "new_TailorProfile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "bio" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "styles" JSONB NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "turnaroundDays" INTEGER NOT NULL,
    "rating" REAL NOT NULL,
    "portfolioImages" JSONB NOT NULL,
    "workshopAddress" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "TailorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TailorProfile" ("basePrice", "bio", "portfolioImages", "rating", "specialty", "styles", "turnaroundDays", "userId") SELECT "basePrice", "bio", "portfolioImages", "rating", "specialty", "styles", "turnaroundDays", "userId" FROM "TailorProfile";
DROP TABLE "TailorProfile";
ALTER TABLE "new_TailorProfile" RENAME TO "TailorProfile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
