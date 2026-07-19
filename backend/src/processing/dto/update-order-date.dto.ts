import { IsDateString } from 'class-validator';

export class UpdateOrderDateDto {
  @IsDateString()
  orderDate: string;
}
