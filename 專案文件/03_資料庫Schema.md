# YowThi ERP V4.0 — 資料庫 Schema

> 技術：PostgreSQL + Prisma ORM
> 硬刪採用 physical delete，每次硬刪寫入 AuditLog（含 beforeData 快照）
> 所有金額欄位為 Int，Service 層統一 Math.floor()

-----

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==========================================
// Enums
// ==========================================

enum Role {
  ADMIN
  OFFICE
  FACTORY
  GUIDED
}

enum ProcessingType {
  H01
  H02
  H03
}

enum ProcessingSourceType {
  RECEIVING
  DEFECT
}

// ==========================================
// 使用者系統
// ==========================================

model User {
  id           Int       @id @default(autoincrement())
  username     String    @unique
  passwordHash String                    // bcrypt hash，禁止明碼
  role         Role
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  auditLogs    AuditLog[]

  @@map("users")
}

// ==========================================
// 基本資料模組 - Master Data
// ==========================================

model Farmer {
  id          String    @id             // 手動輸入，必填
  name        String
  phone       String?
  address     String?
  bankName    String?
  bankAccount String?
  imageUrl    String?                   // 僅 Master Data 可存圖片
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  receivingBatches  ReceivingBatch[]
  processingDetails ProcessingDetail[]

  @@map("farmers")
}

model Employee {
  id          String    @id
  name        String
  phone       String?
  address     String?
  bankName    String?
  bankAccount String?
  imageUrl    String?
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  processingDetails ProcessingDetail[]
  packagingDetails  PackagingDetail[]

  @@map("employees")
}

model Supplier {
  id          String    @id
  name        String
  phone       String?
  address     String?
  bankName    String?
  bankAccount String?
  imageUrl    String?
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  contractWorkDetails ContractWorkDetail[]

  @@map("suppliers")
}

model Carrier {
  id          String    @id
  name        String
  phone       String?
  address     String?
  bankName    String?
  bankAccount String?
  imageUrl    String?
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  transportDetails TransportDetail[]

  @@map("carriers")
}

model Customer {
  id        String    @id
  name      String
  phone     String?
  address   String?
  imageUrl  String?
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  salesOrders SalesOrder[]

  @@map("customers")
}

model ReceivingItem {
  id        String    @id
  name      String
  imageUrl  String?
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  receivingDetails  ReceivingDetail[]
  receivingOrders   ReceivingOrder[]
  processingOrders  ProcessingOrder[]

  @@map("receiving_items")
}

model ProcessingItem {
  id        String         @id           // H01 / H02 / H03（固定，ID不可改，不可新增）
  type      ProcessingType @unique
  name      String                       // 名稱可改（H01→原料加工, H02→成品加工, H03→瑕疵品加工）
  imageUrl  String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  processingDetails ProcessingDetail[]

  @@map("processing_items")
}

model PackagingItem {
  id        String    @id
  name      String
  imageUrl  String?
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  packagingDetails PackagingDetail[]

  @@map("packaging_items")
}

model Product {
  id        String    @id
  name      String
  imageUrl  String?
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  salesDetails        SalesDetail[]
  contractWorkDetails ContractWorkDetail[]
  transportDetails    TransportDetail[]

  @@map("products")
}

model PurchaseItem {
  id        String    @id
  name      String
  imageUrl  String?
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  purchaseDetails PurchaseDetail[]

  @@map("purchase_items")
}

// ==========================================
// 進貨系統（S）
// ==========================================

model ReceivingOrder {
  id              String        @id    // 格式：S-YYYYMMDD-N（N=1～4，每品項獨立循環）
  orderDate       DateTime      @db.Date
  receivingItemId String                // 進貨品項外鍵，決定序號循環範圍
  receivingItem   ReceivingItem @relation(fields: [receivingItemId], references: [id])
  h02Done         Boolean       @default(false) // 成品加工是否完成（整單層級，對應 H02）
  h03Done         Boolean       @default(false) // 瑕疵品加工是否完成（整單層級，對應 H03）
  isDeleted       Boolean       @default(false)
  deletedAt       DateTime?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  batches           ReceivingBatch[]
  processingDetails ProcessingDetail[] // H02 / H03 關聯整張進貨單

  // 同一天 + 同一進貨品項 = 只有一張進貨單
  @@unique([orderDate, receivingItemId])
  @@map("receiving_orders")
}

model ReceivingBatch {
  id             String         @id   // 進貨單序號-農民ID-批次編號
  orderId        String
  order          ReceivingOrder @relation(fields: [orderId], references: [id])
  farmerId       String
  farmer         Farmer         @relation(fields: [farmerId], references: [id])
  batchNo        Int
  processingDone Boolean        @default(false) // H01 加工是否完成（批次層級）
  salesConfirmed Boolean        @default(false) // 系統自動
  isDeleted      Boolean        @default(false)
  deletedAt      DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  details           ReceivingDetail[]
  processingDetails ProcessingDetail[] // H01 關聯批次
  salesBatches      SalesReceivingBatch[]

  @@unique([orderId, farmerId, batchNo])
  @@map("receiving_batches")
}

model ReceivingDetail {
  id        Int            @id @default(autoincrement())
  batchId   String
  batch     ReceivingBatch @relation(fields: [batchId], references: [id])
  itemId    String
  item      ReceivingItem  @relation(fields: [itemId], references: [id])
  farmerId  String
  farmer    Farmer         @relation(fields: [farmerId], references: [id])
  quantity  Decimal        @db.Decimal(10, 3)
  unitPrice Decimal        @db.Decimal(12, 2)
  amount    Int                             // Math.floor(quantity × unitPrice)
  isDeleted Boolean        @default(false)
  deletedAt DateTime?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  @@map("receiving_details")
}

// ==========================================
// 加工系統（PO）
// ==========================================

model ProcessingOrder {
  id                String               @id @default(cuid())
  orderNo           String               @unique   // PO-YYYYMMDD-XXX
  orderDate         DateTime             @db.Date
  receivingItemId   String               // 進貨品項，決定唯一性條件
  receivingItem     ReceivingItem        @relation(fields: [receivingItemId], references: [id])
  sourceType        ProcessingSourceType
  isDeleted         Boolean              @default(false)
  deletedAt         DateTime?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  details ProcessingDetail[]

  // 每日 + 相同進貨品項 限一張主加工單
  @@unique([orderDate, receivingItemId])
  @@map("processing_orders")
}

model ProcessingDetail {
  id          Int             @id @default(autoincrement())
  batchCode   String          @unique         // 加工批次識別碼
  orderId     String
  order       ProcessingOrder @relation(fields: [orderId], references: [id])
  itemId      String
  item        ProcessingItem  @relation(fields: [itemId], references: [id])

  // ── H01 專用：來源為 ReceivingBatch（批次層級）
  batchId     String?
  batch       ReceivingBatch? @relation(fields: [batchId], references: [id])
  farmerId    String?
  farmer      Farmer?         @relation(fields: [farmerId], references: [id])

  // ── H02 / H03 專用：來源為 ReceivingOrder（整單層級）
  receivingOrderId String?
  receivingOrder   ReceivingOrder? @relation(fields: [receivingOrderId], references: [id])

  // ── H03 專用：來源為 DefectPool
  defectPoolId String?
  defectPool   DefectPool?    @relation(fields: [defectPoolId], references: [id])

  // 員工（所有加工類型必填）
  employeeId  String
  employee    Employee        @relation(fields: [employeeId], references: [id])

  // 數量
  inputQty    Decimal         @db.Decimal(10, 3) // 投入量
  outputQty   Decimal         @db.Decimal(10, 3) // 完成品
  defectQty   Decimal         @db.Decimal(10, 3) @default(0) // H01 專用：瑕疵品 → DefectPool
  wasteQty    Decimal         @db.Decimal(10, 3) @default(0) // H02/H03 專用：廢料

  wageRate    Decimal         @db.Decimal(12, 2)
  amount      Int                                // v1 單筆捨棄；v2 群組合計捨棄後的穩定分配額
  wageCalculationVersion Int @default(1)          // 1=歷史單筆計算；2=同加工單+員工+加工類型合計計算
  workTime    DateTime        @default(now())

  // 管理者欄位
  salesOrderId String?
  salesOrder   SalesOrder?    @relation(fields: [salesOrderId], references: [id])
  notes        String?

  // 狀態
  isOffset    Boolean         @default(false)
  isDeleted   Boolean         @default(false)
  deletedAt   DateTime?
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  auditLogs   AuditLog[]
  defectPools DefectPool[]    @relation("SourceDetail")

  @@map("processing_details")
}

// ==========================================
// DefectPool（系統自動維護）
// ==========================================

model DefectPool {
  id                String   @id @default(cuid())
  sourceBatchId     String                       // 來源 ProcessingDetail.batchCode
  sourceDetail      ProcessingDetail @relation("SourceDetail", fields: [sourceBatchId], references: [batchCode])
  quantity          Decimal  @db.Decimal(10, 3)  // 原始瑕疵品數量（H01 defectQty）
  usedQuantity      Decimal  @db.Decimal(10, 3)  @default(0)
  remainingQuantity Decimal  @db.Decimal(10, 3)  // 系統自動：quantity - usedQuantity
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  processingDetails ProcessingDetail[]

  @@map("defect_pool")
}

// ==========================================
// 代工系統（C）
// ==========================================

model ContractWorkOrder {
  id        String    @id             // C-YYYYMMDD-XXX
  orderDate DateTime  @db.Date
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  details ContractWorkDetail[]

  @@map("contract_work_orders")
}

model ContractWorkDetail {
  id         Int               @id @default(autoincrement())
  orderId    String
  order      ContractWorkOrder @relation(fields: [orderId], references: [id])
  supplierId String
  supplier   Supplier          @relation(fields: [supplierId], references: [id])
  productId  String
  product    Product           @relation(fields: [productId], references: [id])
  quantity   Decimal           @db.Decimal(10, 3) // 數量（箱/件）
  weight     Decimal           @db.Decimal(10, 3) // 實際過磅重量
  unitPrice  Decimal           @db.Decimal(12, 2) // 每單位價格
  amount     Int                                  // Math.floor(quantity × weight × unitPrice)
  notes      String?
  isDeleted  Boolean           @default(false)
  deletedAt  DateTime?
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  @@map("contract_work_details")
}

// ==========================================
// 包裝系統（P）
// ==========================================

model PackagingOrder {
  id        String    @id             // P-YYYYMMDD-XXX
  orderDate DateTime  @db.Date
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  details PackagingDetail[]

  @@map("packaging_orders")
}

model PackagingDetail {
  id           Int            @id @default(autoincrement())
  orderId      String
  order        PackagingOrder @relation(fields: [orderId], references: [id])
  employeeId   String
  employee     Employee       @relation(fields: [employeeId], references: [id])
  itemId       String
  item         PackagingItem  @relation(fields: [itemId], references: [id])
  quantity     Decimal        @db.Decimal(10, 3)
  wageRate     Decimal        @db.Decimal(12, 2)
  amount       Int                            // Math.floor(quantity × wageRate)
  workTime     DateTime       @default(now())
  salesOrderId String?
  salesOrder   SalesOrder?    @relation(fields: [salesOrderId], references: [id])
  notes        String?
  isDeleted    Boolean        @default(false)
  deletedAt    DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@map("packaging_details")
}

// ==========================================
// 運輸系統（T）
// ==========================================

model TransportOrder {
  id        String    @id             // T-YYYYMMDD-XXX
  orderDate DateTime  @db.Date
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  details TransportDetail[]

  @@map("transport_orders")
}

model TransportDetail {
  id           Int             @id @default(autoincrement())
  orderId      String
  order        TransportOrder  @relation(fields: [orderId], references: [id])
  carrierId    String
  carrier      Carrier         @relation(fields: [carrierId], references: [id])
  productId    String          // 僅記錄 / 查詢 / 分類，不參與金額計算
  product      Product         @relation(fields: [productId], references: [id])
  quantity     Decimal         @db.Decimal(10, 3) // 車次（或運輸次數）
  unitPrice    Decimal         @db.Decimal(12, 2) // 每車固定價或每公斤固定價
  amount       Int                                // Math.floor(quantity × unitPrice)
  salesOrderId String?
  salesOrder   SalesOrder?     @relation(fields: [salesOrderId], references: [id])
  notes        String?
  isDeleted    Boolean         @default(false)
  deletedAt    DateTime?
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt

  @@map("transport_details")
}

// ==========================================
// 銷售系統（O）
// ==========================================

model SalesOrder {
  id         String    @id            // O-YYYYMMDD-XXX
  orderDate  DateTime  @db.Date
  customerId String
  customer   Customer  @relation(fields: [customerId], references: [id])
  isDeleted  Boolean   @default(false)
  deletedAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  details           SalesDetail[]
  processingDetails ProcessingDetail[]
  packagingDetails  PackagingDetail[]
  transportDetails  TransportDetail[]
  receivingBatches  SalesReceivingBatch[]

  @@map("sales_orders")
}

model SalesDetail {
  id        Int        @id @default(autoincrement())
  orderId   String
  order     SalesOrder @relation(fields: [orderId], references: [id])
  productId String
  product   Product    @relation(fields: [productId], references: [id])
  weight    Decimal    @db.Decimal(10, 3)
  quantity  Decimal    @db.Decimal(10, 3)
  unitPrice Decimal    @db.Decimal(12, 2)
  amount    Int
  isDeleted Boolean    @default(false)
  deletedAt DateTime?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@map("sales_details")
}

model SalesReceivingBatch {
  salesOrderId     String
  receivingBatchId String
  salesOrder       SalesOrder     @relation(fields: [salesOrderId], references: [id])
  receivingBatch   ReceivingBatch @relation(fields: [receivingBatchId], references: [id])

  @@id([salesOrderId, receivingBatchId])
  @@map("sales_receiving_batches")
}

// ==========================================
// 採購系統（B）
// ==========================================

model PurchaseOrder {
  id        String    @id            // B-YYYYMMDD-XXX
  orderDate DateTime  @db.Date
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  details PurchaseDetail[]

  @@map("purchase_orders")
}

model PurchaseDetail {
  id        Int           @id @default(autoincrement())
  orderId   String
  order     PurchaseOrder @relation(fields: [orderId], references: [id])
  itemId    String
  item      PurchaseItem  @relation(fields: [itemId], references: [id])
  weight    Decimal       @db.Decimal(10, 3)
  quantity  Decimal       @db.Decimal(10, 3)
  unitPrice Decimal       @db.Decimal(12, 2)
  amount    Int
  isDeleted Boolean       @default(false)
  deletedAt DateTime?
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  @@map("purchase_details")
}

// ==========================================
// Audit Log（硬刪必寫）
// ==========================================

model AuditLog {
  id                 Int              @id @default(autoincrement())
  actionType         String           // CREATE / SOFT_DELETE / HARD_DELETE / OFFSET
  targetTable        String           // 被操作的資料表名稱
  targetId           String           // 被操作的記錄ID
  operatorId         Int
  operator           User             @relation(fields: [operatorId], references: [id])
  operatedAt         DateTime         @default(now())
  ipAddress          String?
  beforeData         Json?            // 硬刪前資料快照
  notes              String?

  processingDetailId Int?
  processingDetail   ProcessingDetail? @relation(fields: [processingDetailId], references: [id])

  @@map("audit_logs")
}
```

-----

## 金額計算規範

```typescript
// ✅ 唯一合法寫法
const amount = Math.floor(Number(qty) * Number(rate))

// ❌ 禁止
Math.round() / Math.ceil() / .toFixed()
```

-----

## 進貨單序號產生邏輯

```typescript
// 查詢該進貨品項最後一張進貨單的循環編號 N
const last = await prisma.receivingOrder.findFirst({
  where: { receivingItemId },
  orderBy: { createdAt: 'desc' }
})
const lastN = last ? parseInt(last.id.split('-')[2]) : 0
const nextN = lastN === 4 ? 1 : lastN + 1
const dateStr = format(new Date(), 'yyyyMMdd')
const newId = `S-${dateStr}-${nextN}`
// 範例：S-20260530-1
```

-----

## 各加工品項欄位對照表

|欄位               |H01 原料加工           |H02 成品加工           |H03 瑕疵品加工          |
|-----------------|-------------------|-------------------|-------------------|
|來源層級             |ReceivingBatch（批次） |ReceivingOrder（整單） |ReceivingOrder（整單） |
|batchId          |✅ 必填              |❌                  |❌                  |
|farmerId         |✅ 必填              |❌                  |❌                  |
|receivingOrderId |❌                  |✅ 必填              |✅ 必填              |
|defectPoolId     |❌                  |❌                  |✅ 必填              |
|defectQty        |✅ 產生 DefectPool   |❌                  |❌                  |
|wasteQty         |❌                  |✅                  |✅                  |
|完成狀態欄位           |ReceivingBatch.processingDone|ReceivingOrder.h02Done|ReceivingOrder.h03Done|

-----

## 資料庫變更記錄

|日期        |版本        |變更說明                                                                                                                                                            |
|----------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
|2026-05-28|v4.0 FINAL|角色改為 ADMIN/OFFICE/FACTORY/GUIDED；ProcessingOrder 移除 @unique 改用 orderNo；DefectPool remainingQuantity 系統自動維護；加入 inputQty、DefectPool relation；金額統一 Int + Math.floor|
|2026-05-28|v4.1      |運輸：移除 weight、加入 unitPrice，金額 = Math.floor(quantity × unitPrice)；代工：移除舊邏輯，加入 quantity + weight + unitPrice，金額 = Math.floor(quantity × weight × unitPrice)        |
|2026-05-28|v4.2      |資料查詢與報表統一於 Phase 8 開發；待確認問題全數清空                                                                                                                                 |
|2026-05-29|v4.3      |ProcessingOrder 新增 receivingItemId 欄位；唯一性條件改為 @@unique([orderDate, receivingItemId])；ProcessingItem 名稱可改 ID 不可改；ReceivingItem 新增 processingOrders relation      |
|2026-05-30|v4.4      |ReceivingOrder 新增 h02Done/h03Done（整單層級）；新增 receivingItemId 外鍵；新增 @@unique([orderDate, receivingItemId])；ProcessingDetail 新增 receivingOrderId（H02/H03 整單來源）；defectQty 改為 H01 專用；wasteQty 改為 H02/H03 共用|
|2026-05-30|v4.5      |ReceivingOrder 序號格式改為 S-YYYYMMDD-N（N=1～4，每進貨品項獨立循環）；ReceivingItem 新增 receivingOrders relation                                                                  |
|2026-07-29|v4.x      |ProcessingDetail 新增 wageCalculationVersion；新版加工工資先保留每筆精確值，再按同加工單＋員工＋加工類型合計後捨棄小數，既有未編輯資料維持 v1 金額|
