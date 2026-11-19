-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "location" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TailorProfile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "bio" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "styles" JSONB NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "turnaroundDays" INTEGER NOT NULL,
    "rating" REAL NOT NULL,
    "portfolioImages" JSONB NOT NULL,
    CONSTRAINT "TailorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
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
    "checkoutKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_tailorId_fkey" FOREIGN KEY ("tailorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "clientKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "installment" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "leg" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNASSIGNED',
    "courier" TEXT NOT NULL DEFAULT '',
    "contact" TEXT NOT NULL DEFAULT '',
    "tracking" TEXT NOT NULL DEFAULT '',
    "dispatchedAt" DATETIME,
    "deliveredAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "orderId" TEXT,
    "messageId" TEXT,
    "key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Upload_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Upload_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");

-- CreateIndex
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_tailorId_status_idx" ON "Order"("tailorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Message_clientKey_key" ON "Message"("clientKey");

-- CreateIndex
CREATE INDEX "Message_orderId_createdAt_idx" ON "Message"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_eventId_key" ON "Payment"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_installment_key" ON "Payment"("orderId", "installment");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_orderId_leg_key" ON "Shipment"("orderId", "leg");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_messageId_key" ON "Upload"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_key_key" ON "Upload"("key");
