import { IsOptional, IsString } from 'class-validator';

export class SalesOrdersForCostQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  channel?: string; // 'EXPORT' | 'DOMESTIC'
}

export interface SalesOrderForCostRow {
  id: string;
  orderDate: Date;
  customerName: string;
  amount: number; // 該訂單內，符合 channel 的商品銷售金額加總
}

export class CostAnalysisQueryDto {
  @IsOptional()
  @IsString()
  exportOrderIds?: string; // 逗號分隔

  @IsOptional()
  @IsString()
  domesticOrderIds?: string; // 逗號分隔
}

export interface CostAnalysisExportResult {
  totalSales: number; // 銷售金額（出口）
  // 真實成本（2026-06-30 改版）：Σ（每筆關聯入庫明細的賣出數量 × weight × unitPrice）
  // unitPrice 來自入庫時帶入的「進貨單鎖定生產成本」，是固定值，不會隨查詢次數重複或漏算
  totalRealCost: number;
  totalPackaging: number; // 包裝費（該批銷售單直接關聯的包裝明細，一對一不會重複）
  grossProfit: number; // 銷售 - 真實成本 - 包裝費
}

export interface CostAnalysisDomesticResult {
  totalSales: number; // 銷售金額（境內）
  totalH03Wage: number; // H03 加工工資總額（透過 銷售→入庫→進貨單 關聯追溯取得對應 H03 加工明細金額加總，去重但不按數量比例分攤；境內目前未納入單位成本鎖定機制，維持原追溯邏輯）
  grossProfit: number; // 銷售 - H03加工工資
}

export interface CostAnalysisResult {
  exportResult: CostAnalysisExportResult | null;
  domesticResult: CostAnalysisDomesticResult | null;
  combinedGrossProfit: number;
}
