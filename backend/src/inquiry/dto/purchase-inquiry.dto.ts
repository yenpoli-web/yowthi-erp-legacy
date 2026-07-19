import { IsOptional, IsString } from 'class-validator';

export class PurchaseInquiryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}

export interface PurchaseInquiryRow {
  date: Date;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PurchaseInquiryResult {
  rows: PurchaseInquiryRow[];
  summary: {
    totalQuantity: number;
    totalAmount: number;
  };
}
