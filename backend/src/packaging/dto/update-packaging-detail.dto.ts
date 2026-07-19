import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdatePackagingDetailDto {
  @IsString()
  @IsOptional()
  itemId?: string;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsOptional()
  wageRate?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
