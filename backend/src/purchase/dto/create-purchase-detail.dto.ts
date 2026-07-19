import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePurchaseDetailDto {
  @IsString()
  orderId: string;

  @IsString()
  itemId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
