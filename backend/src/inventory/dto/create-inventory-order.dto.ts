import { IsString, IsNotEmpty } from 'class-validator';
export class CreateInventoryOrderDto {
  @IsString() @IsNotEmpty() orderDate: string;
  notes?: string;
}