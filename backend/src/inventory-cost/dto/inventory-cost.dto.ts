import { IsInt, IsOptional, Min } from 'class-validator';

export class LockCostDto {
  @IsInt()
  @Min(0)
  estBasketQty!: number;

  @IsInt()
  @Min(0)
  estBoxQty!: number;
}

export class InventoryCostQueryDto {
  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  receivingItemId?: string;

  // 'ALL' | 'LOCKED' | 'UNLOCKED'，預設只顯示未鎖定（待處理）
  @IsOptional()
  status?: 'ALL' | 'LOCKED' | 'UNLOCKED';
}

export interface InventoryCostOrderResult {
  orderId: string;
  orderDate: Date;
  receivingItem: { id: string; name: string; imageUrl: string | null };
  h02Done: boolean;

  totalH01H02Amount: number; // H01+H02 加工金額加總
  totalH02OutputWeight: number; // H02 完成品總重量（公斤）

  costLocked: boolean;
  costUnitPrice: number | null; // 欄位1：基礎成本/kg（已鎖定才有值）
  costUnitPriceEst: number | null; // 欄位2：預估成本/kg（已鎖定才有值）
  costEstBasketQty: number | null;
  costEstBoxQty: number | null;
  costLockedAt: Date | null;
  costLockedByUsername: string | null;

  // 欄位3：真實成本/kg，永遠即時計算（不論鎖定狀態），= 欄位1 + 實際包裝成本/kg
  realPackagingAmount: number; // 該進貨單目前實際登錄的 K01/K02/K04 包裝明細金額加總
  realUnitPrice: number | null; // 欄位3：基礎成本/kg + 實際包裝成本/kg
}

export interface InventoryCostPackagingDetailRow {
  id: number;
  itemId: string;
  itemName: string;
  employeeName: string;
  quantity: number;
  wageRate: number;
  amount: number;
  workTime: Date;
}

export interface InventoryCostOrderDetailResult extends InventoryCostOrderResult {
  processingDetails: {
    id: number;
    itemType: string;
    employeeName: string;
    outputQty: number;
    amount: number;
  }[];
  packagingDetails: InventoryCostPackagingDetailRow[];
}

// ── 代工成本鎖定（2026-06-30）──

export interface ContractCostDetailResult {
  id: number;
  orderId: string;
  orderDate: Date;
  supplierName: string;
  productName: string;
  quantity: number;
  weight: number;
  unitPrice: number; // 廠商收費單價
  amount: number;
  costLocked: boolean;
  costUnitPrice: number | null; // 鎖定的單位成本 = amount ÷ (quantity × weight)
  costLockedAt: Date | null;
  costLockedByUsername: string | null;
}
