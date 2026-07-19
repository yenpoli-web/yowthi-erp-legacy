import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';

export class UpdateInventoryDetailDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}
