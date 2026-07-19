import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateContractWorkDetailDto {
  @IsString() @IsNotEmpty() orderId: string;
  @IsString() @IsNotEmpty() supplierId: string;
  @IsString() @IsNotEmpty() productId: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) weight: number;
  @IsNumber() @Min(0) unitPrice: number;
  @IsOptional() @IsString() notes?: string;
}