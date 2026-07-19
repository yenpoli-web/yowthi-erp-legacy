import { IsOptional, IsString } from 'class-validator';

export class SalesInquiryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  customerIds?: string;
}

export interface SalesInquiryRow {
  date: Date;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  weight: number;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface SalesInquiryResult {
  rows: SalesInquiryRow[];
  summary: {
    totalWeight: number;
    totalQuantity: number;
    totalAmount: number;
  };
}
