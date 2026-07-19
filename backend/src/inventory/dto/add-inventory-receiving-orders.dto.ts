import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
export class AddInventoryReceivingOrdersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  receivingOrderIds: string[];
}
