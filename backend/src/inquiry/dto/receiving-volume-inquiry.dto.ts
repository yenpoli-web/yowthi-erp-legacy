import { IsOptional, IsString } from 'class-validator';

export class ReceivingVolumeInquiryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  receivingItemId?: string;
}

export interface ReceivingVolumeInquiryRow {
  date: Date;
  orderId: string;
  quantity: number;
  avgPrice: number;
  amount: number;
}

export interface ReceivingVolumeInquiryResult {
  rows: ReceivingVolumeInquiryRow[];
  summary: {
    totalQuantity: number;
    totalAmount: number;
    avgUnitPrice: number;
  };
}
