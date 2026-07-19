-- AlterTable
ALTER TABLE "contract_work_orders" ADD COLUMN     "inventoryDone" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "inventory_contract_orders" (
    "inventoryOrderId" TEXT NOT NULL,
    "contractOrderId" TEXT NOT NULL,

    CONSTRAINT "inventory_contract_orders_pkey" PRIMARY KEY ("inventoryOrderId","contractOrderId")
);

-- AddForeignKey
ALTER TABLE "inventory_contract_orders" ADD CONSTRAINT "inventory_contract_orders_inventoryOrderId_fkey" FOREIGN KEY ("inventoryOrderId") REFERENCES "inventory_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_contract_orders" ADD CONSTRAINT "inventory_contract_orders_contractOrderId_fkey" FOREIGN KEY ("contractOrderId") REFERENCES "contract_work_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
