import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateReceivingDetailDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  unitPrice?: number;
}
