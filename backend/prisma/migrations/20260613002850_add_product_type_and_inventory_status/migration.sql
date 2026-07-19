/*
  Warnings:

  - You are about to drop the column `processingType` on the `inventory_details` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('EXPORT', 'DOMESTIC');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('NONE', 'IN_SALES', 'DONE');

-- AlterTable
ALTER TABLE "inventory_details" DROP COLUMN "processingType",
ADD COLUMN     "salesStatus" "InventoryStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'EXPORT';
