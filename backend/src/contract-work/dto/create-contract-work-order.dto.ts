import { IsString, IsNotEmpty } from 'class-validator';

export class CreateContractWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  orderDate: string;
}