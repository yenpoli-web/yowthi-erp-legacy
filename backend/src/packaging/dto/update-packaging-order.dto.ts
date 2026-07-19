import { IsString, IsOptional } from 'class-validator';

export class UpdatePackagingOrderDto {
  @IsString()
  @IsOptional()
  salesOrderId?: string | null;

  @IsString()
  @IsOptional()
  receivingOrderId?: string | null;
}
