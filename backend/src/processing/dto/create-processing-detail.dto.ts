import { IsString, IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class CreateProcessingDetailDto {
  @IsString()
  orderId: string;

  @IsString()
  itemId: string; // H01 / H02 / H03

  @IsString()
  employeeId: string;

  // H01 專用
  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  farmerId?: string;

  // H02 / H03 專用
  @IsOptional()
  @IsString()
  receivingOrderId?: string;

  // H03 專用
  @IsOptional()
  @IsString()
  defectPoolId?: string;

  @IsNumber()
  @Min(0)
  inputQty: number;

  @IsNumber()
  @Min(0)
  outputQty: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defectQty?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  wasteQty?: number;

  @IsNumber()
  @Min(0)
  wageRate: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  workTime?: string;
}
