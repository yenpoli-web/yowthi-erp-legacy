import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateTransportOrderDto {
  @IsString()
  orderDate: string; // YYYY-MM-DD

  @IsString()
  carrierId: string;

  @IsNumber()
  quantity: number; // 車數

  @IsNumber()
  unitPrice: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
