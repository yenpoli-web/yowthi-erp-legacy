import { IsOptional, IsString } from 'class-validator';

export class H03ProcessingInquiryQueryDto {
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

export interface H03ProcessingInquiryRow {
  date: Date;
  orderId: string;
  receivingItemName: string;
  h01Defect: number; // 不良品（H01 不良品總量）
  h03Output: number; // 完成品（H03）
  amount: number; // H03 金額（員工工資）
}

export interface H03ProcessingInquiryResult {
  rows: H03ProcessingInquiryRow[];
  summary: {
    totalH01Defect: number;
    totalH03Output: number;
    totalAmount: number;
  };
}
