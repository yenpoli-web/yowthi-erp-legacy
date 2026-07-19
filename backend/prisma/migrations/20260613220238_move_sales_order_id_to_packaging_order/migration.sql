/*
  Warnings:

  - You are about to drop the column `salesOrderId` on the `packaging_details` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "packaging_details" DROP CONSTRAINT "packaging_details_salesOrderId_fkey";

-- AlterTable
ALTER TABLE "packaging_details" DROP COLUMN "salesOrderId";

-- AlterTable
ALTER TABLE "packaging_orders" ADD COLUMN     "salesOrderId" TEXT;

-- AddForeignKey
ALTER TABLE "packaging_orders" ADD CONSTRAINT "packaging_orders_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
