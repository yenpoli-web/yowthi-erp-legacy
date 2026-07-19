import { IsOptional, IsString } from 'class-validator';

export class PackagingInquiryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  packagingItemIds?: string;
}

export interface PackagingInquiryRow {
  date: Date;
  employeeId: string;
  employeeName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  wageRate: number;
  amount: number;
}

export interface PackagingInquiryResult {
  rows: PackagingInquiryRow[];
  summary: {
    totalQuantity: number;
    totalAmount: number;
  };
}
