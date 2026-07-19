import { IsOptional, IsString } from 'class-validator';

export class ContractWorkInquiryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  supplierIds?: string;

  @IsOptional()
  @IsString()
  productIds?: string;
}

export interface ContractWorkInquiryRow {
  date: Date;
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  weight: number;
  unitPrice: number;
  amount: number;
}

export interface ContractWorkInquiryResult {
  rows: ContractWorkInquiryRow[];
  summary: {
    totalQuantity: number;
    totalWeight: number;
    totalAmount: number;
  };
}
