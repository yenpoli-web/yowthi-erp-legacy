import { IsString, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateReceivingOrderDto {
  @IsDateString()
  @IsNotEmpty()
  orderDate: string;

  @IsString()
  @IsNotEmpty()
  receivingItemId: string;
}
