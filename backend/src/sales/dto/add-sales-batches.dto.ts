import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class AddSalesBatchesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  receivingBatchIds: string[];
}
