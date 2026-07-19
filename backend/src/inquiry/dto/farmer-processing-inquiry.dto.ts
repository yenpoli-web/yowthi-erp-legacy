import { IsOptional, IsString } from 'class-validator';

export class FarmerProcessingInquiryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  farmerIds?: string; // 逗號分隔，多選
}

export interface FarmerProcessingInquiryRow {
  date: Date;
  farmerId: string;
  farmerName: string;
  inputQty: number; // 進貨重量（ReceivingDetail.quantity 加總，農民送貨重量）
  processingInputQty: number; // 加工取用量（ProcessingDetail.inputQty 加總，H01 實際取用量，來自加工管理）
  outputQty: number;
  defectQty: number;
  loss: number;
  lossRate: number | null;
  completionRate: number | null;
  amount: number;
}

export interface FarmerProcessingInquiryResult {
  rows: FarmerProcessingInquiryRow[];
  summary: {
    totalInputQty: number;
    totalProcessingInputQty: number;
    totalOutputQty: number;
    totalDefectQty: number;
    totalAmount: number;
  };
}
