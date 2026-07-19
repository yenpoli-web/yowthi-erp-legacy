-- Phase 8.x：銷售-庫存關聯表新增成本快取欄位（成本分析用）
-- 執行前請先停止後端 (Ctrl+C)
-- 執行方式：於 pgAdmin Query Tool 對 yowthi_erp_v4 資料庫執行

ALTER TABLE "sales_inventory_details"
  ADD COLUMN "costUnitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "costAmount" INTEGER NOT NULL DEFAULT 0;

-- 執行完成後：
-- 1. cd backend
-- 2. npx prisma generate   (僅此指令，禁止 prisma migrate dev)
-- 3. 重新啟動後端 (npm run start:dev 或 pm2 restart)
