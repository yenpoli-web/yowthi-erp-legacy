import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateReceivingOrderDto {
  @IsBoolean()
  @IsOptional()
  h02Done?: boolean;

  @IsBoolean()
  @IsOptional()
  h03Done?: boolean;
}
