import { IsOptional, IsString } from 'class-validator';

export class TransportInquiryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  carrierIds?: string;
}

export interface TransportInquiryRow {
  date: Date;
  carrierId: string;
  carrierName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface TransportInquiryResult {
  rows: TransportInquiryRow[];
  summary: {
    totalQuantity: number;
    totalAmount: number;
  };
}
