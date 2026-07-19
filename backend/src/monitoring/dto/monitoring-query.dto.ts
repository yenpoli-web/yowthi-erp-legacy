export class MonitoringQueryDto {
  startDate?: string;
  endDate?: string;
  receivingItemId?: string;
  status?: 'ALL' | 'PENDING' | 'DONE';
}

export interface MonitoringBatchResult {
  batchId: string;
  farmer: { id: string; name: string };
  inputQty: number;
  processingDone: boolean;
  h01Output: number | null;
  h01Defect: number | null;
  h01Amount: number | null;
  loss: number | null;
  lossRate: number | null;
  completionRate: number | null;
}

export interface MonitoringTypeStats {
  totalQty: number;
  outputQty: number;
  amount: number;
  completionRate: number | null;
}

export interface MonitoringH01Stats {
  outputQty: number;
  defectQty: number;
  amount: number;
}

export interface MonitoringOrderResult {
  orderId: string;
  orderDate: Date;
  receivingItem: { id: string; name: string; imageUrl: string | null };
  h02Done: boolean;
  h03Done: boolean;
  totalInputQty: number;
  totalAmount: number;
  h01Stats: MonitoringH01Stats;
  h02Stats: MonitoringTypeStats;
  h03Stats: MonitoringTypeStats;
  batches: MonitoringBatchResult[];
}
