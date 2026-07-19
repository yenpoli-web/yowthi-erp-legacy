import { IsString, IsDateString, IsEnum } from 'class-validator';
import { ProcessingSourceType } from '@prisma/client';

export class CreateProcessingOrderDto {
  @IsDateString()
  orderDate: string;

  @IsString()
  receivingItemId: string;

  @IsEnum(ProcessingSourceType)
  sourceType: ProcessingSourceType;
}
