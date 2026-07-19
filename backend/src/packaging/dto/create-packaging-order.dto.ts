import { IsString, IsOptional } from 'class-validator';

export class CreatePackagingOrderDto {
  @IsString()
  orderDate: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  salesOrderId?: string;

  @IsString()
  @IsOptional()
  receivingOrderId?: string;
}
