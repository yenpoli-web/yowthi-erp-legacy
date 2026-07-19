import { IsString, IsNotEmpty, IsInt, IsNumber, Min } from 'class-validator';

export class CreateInventoryDetailDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  weight: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
