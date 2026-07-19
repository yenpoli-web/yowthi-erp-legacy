import { IsString } from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsString()
  orderDate: string; // YYYY-MM-DD
}
