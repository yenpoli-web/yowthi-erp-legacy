import { IsOptional, IsString } from 'class-validator';

export class ProcessingWageInquiryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}

export interface ProcessingWageInquiryRow {
  date: Date;
  employeeId: string;
  employeeName: string;
  farmerId: string | null;
  farmerName: string | null;
  itemType: string; // H01 / H02 / H03
  itemName: string;
  outputQty: number;
  wageRate: number;
  amount: number;
}

export interface ProcessingWageInquiryResult {
  rows: ProcessingWageInquiryRow[];
  summary: {
    totalOutputQty: number;
    totalAmount: number;
  };
}
