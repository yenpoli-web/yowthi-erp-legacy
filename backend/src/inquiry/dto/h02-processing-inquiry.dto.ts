import { IsOptional, IsString } from 'class-validator';

export class H02ProcessingInquiryQueryDto {
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

export interface H02ProcessingInquiryRow {
  date: Date;
  orderId: string;
  receivingItemName: string;
  inputQty: number; // 進貨量（總重量）
  h01Output: number; // 完成品（H01）
  h02Output: number; // 完成品（H02）
  h01CompletionRate: number | null; // H01完成比例 = h01Output ÷ 總重量
  h02CompletionRate: number | null; // H02完成比例 = h02Output ÷ 總重量
  amount: number; // H02 金額（員工工資）
}

export interface H02ProcessingInquiryResult {
  rows: H02ProcessingInquiryRow[];
  summary: {
    totalH01Output: number;
    totalH02Output: number;
    totalAmount: number;
  };
}
