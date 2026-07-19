/*
  Warnings:

  - A unique constraint covering the columns `[orderDate,receivingItemId]` on the table `receiving_orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `receivingItemId` to the `receiving_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "processing_details" ADD COLUMN     "receivingOrderId" TEXT;

-- AlterTable
ALTER TABLE "receiving_orders" ADD COLUMN     "h02Done" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "h03Done" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inSales" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receivingItemId" TEXT NOT NULL,
ADD COLUMN     "salesDone" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "inventory_orders" (
    "id" TEXT NOT NULL,
    "orderDate" DATE NOT NULL,
    "notes" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_details" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_receiving_orders" (
    "inventoryOrderId" TEXT NOT NULL,
    "receivingOrderId" TEXT NOT NULL,

    CONSTRAINT "inventory_receiving_orders_pkey" PRIMARY KEY ("inventoryOrderId","receivingOrderId")
);

-- CreateTable
CREATE TABLE "sales_inventory_details" (
    "id" SERIAL NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "inventoryDetailId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_inventory_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receiving_orders_orderDate_receivingItemId_key" ON "receiving_orders"("orderDate", "receivingItemId");

-- AddForeignKey
ALTER TABLE "receiving_orders" ADD CONSTRAINT "receiving_orders_receivingItemId_fkey" FOREIGN KEY ("receivingItemId") REFERENCES "receiving_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_details" ADD CONSTRAINT "processing_details_receivingOrderId_fkey" FOREIGN KEY ("receivingOrderId") REFERENCES "receiving_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_details" ADD CONSTRAINT "inventory_details_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "inventory_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_details" ADD CONSTRAINT "inventory_details_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_receiving_orders" ADD CONSTRAINT "inventory_receiving_orders_inventoryOrderId_fkey" FOREIGN KEY ("inventoryOrderId") REFERENCES "inventory_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_receiving_orders" ADD CONSTRAINT "inventory_receiving_orders_receivingOrderId_fkey" FOREIGN KEY ("receivingOrderId") REFERENCES "receiving_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_inventory_details" ADD CONSTRAINT "sales_inventory_details_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_inventory_details" ADD CONSTRAINT "sales_inventory_details_inventoryDetailId_fkey" FOREIGN KEY ("inventoryDetailId") REFERENCES "inventory_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
