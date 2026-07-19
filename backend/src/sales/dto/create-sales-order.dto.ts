import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSalesOrderDto {
  @IsString()
  @IsNotEmpty()
  orderDate: string; // DD-MM-YYYY

  @IsString()
  @IsNotEmpty()
  customerId: string;
}
