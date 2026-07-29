import { IsOptional, IsString } from 'class-validator';

export class EmployeeWageSummaryInquiryQueryDto {
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

export interface EmployeeWageSummaryInquiryRow {
  date: Date;
  employeeId: string;
  employeeName: string;
  processingItemId: string;
  processingItemType: string;
  processingItemName: string;
  amount: number;
}

export interface EmployeeWageSummaryInquiryResult {
  rows: EmployeeWageSummaryInquiryRow[];
  summary: {
    totalAmount: number;
  };
}
