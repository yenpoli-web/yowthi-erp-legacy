import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateTransportOrderDto {
  @IsString()
  @IsOptional()
  carrierId?: string;

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
