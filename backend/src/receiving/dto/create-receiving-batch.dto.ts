import { IsString, IsNotEmpty } from 'class-validator';

export class CreateReceivingBatchDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  farmerId: string;
}
