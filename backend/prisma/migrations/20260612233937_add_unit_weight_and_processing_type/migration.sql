/*
  Warnings:

  - Added the required column `processingType` to the `inventory_details` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inventory_details" ADD COLUMN     "processingType" "ProcessingType" NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "unitWeight" DECIMAL(10,3);
