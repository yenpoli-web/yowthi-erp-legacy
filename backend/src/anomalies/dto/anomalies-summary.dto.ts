export interface UnlinkedSalesRow {
  id: string;
  orderDate: Date;
  customerName: string;
  totalAmount: number;
}

export interface UnlinkedPackagingRow {
  id: string;
  orderDate: Date;
  totalAmount: number;
}

export interface UnlinkedInventoryRow {
  id: string;
  orderDate: Date;
  totalQty: number;
}

export interface StaleProcessingRow {
  id: string;
  orderDate: Date;
  receivingItemName: string;
  daysSince: number;
  h02Done: boolean;
  h03Done: boolean;
}

export interface AnomaliesSummaryResult {
  unlinkedSales: UnlinkedSalesRow[];
  unlinkedPackaging: UnlinkedPackagingRow[];
  unlinkedInventory: UnlinkedInventoryRow[];
  staleProcessing: StaleProcessingRow[];
}
