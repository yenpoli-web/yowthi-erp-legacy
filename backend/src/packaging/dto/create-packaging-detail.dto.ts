import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreatePackagingDetailDto {
  @IsString()
  orderId: string;

  @IsString()
  employeeId: string;

  @IsString()
  itemId: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  wageRate: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
