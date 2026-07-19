/*
  Warnings:

  - You are about to drop the column `weight` on the `purchase_details` table. All the data in the column will be lost.
  - You are about to drop the `transport_details` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `amount` to the `transport_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `carrierId` to the `transport_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `transport_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `transport_orders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "transport_details" DROP CONSTRAINT "transport_details_carrierId_fkey";

-- DropForeignKey
ALTER TABLE "transport_details" DROP CONSTRAINT "transport_details_orderId_fkey";

-- DropForeignKey
ALTER TABLE "transport_details" DROP CONSTRAINT "transport_details_productId_fkey";

-- DropForeignKey
ALTER TABLE "transport_details" DROP CONSTRAINT "transport_details_salesOrderId_fkey";

-- AlterTable
ALTER TABLE "purchase_details" DROP COLUMN "weight";

-- AlterTable
ALTER TABLE "transport_orders" ADD COLUMN     "amount" INTEGER NOT NULL,
ADD COLUMN     "carrierId" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "quantity" DECIMAL(10,3) NOT NULL,
ADD COLUMN     "unitPrice" DECIMAL(12,2) NOT NULL;

-- DropTable
DROP TABLE "transport_details";

-- AddForeignKey
ALTER TABLE "transport_orders" ADD CONSTRAINT "transport_orders_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "carriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
