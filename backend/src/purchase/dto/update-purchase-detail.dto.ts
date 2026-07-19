import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdatePurchaseDetailDto {
  @IsString()
  @IsOptional()
  itemId?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
