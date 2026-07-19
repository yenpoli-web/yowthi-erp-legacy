-- Phase 8.x：成品入庫單新增重量欄位，並改變金額公式為 重量×數量×單價
-- 執行前請先停止後端 (Ctrl+C)
-- 執行方式：於 pgAdmin Query Tool 對 yowthi_erp_v4 資料庫執行

ALTER TABLE "inventory_details"
  ADD COLUMN "weight" DECIMAL(10,3) NOT NULL DEFAULT 0;

-- 執行完成後：
-- 1. cd backend
-- 2. npx prisma generate   (僅此指令，禁止 prisma migrate dev)
-- 3. 重新啟動後端 (npm run start:dev 或 pm2 restart)
