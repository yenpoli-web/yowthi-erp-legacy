import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateReceivingBatchDto {
  @IsBoolean()
  @IsOptional()
  processingDone?: boolean;

  @IsBoolean()
  @IsOptional()
  salesConfirmed?: boolean;
}
