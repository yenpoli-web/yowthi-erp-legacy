import { IsOptional, IsString } from 'class-validator';

export class ReceivingInquiryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  farmerIds?: string;

  @IsOptional()
  @IsString()
  receivingItemId?: string;
}

export interface ReceivingInquiryRow {
  orderId: string;
  date: Date;
  farmerId: string;
  farmerName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface ReceivingInquiryResult {
  rows: ReceivingInquiryRow[];
  summary: {
    totalQuantity: number;
    totalAmount: number;
    avgUnitPrice: number;
  };
}
