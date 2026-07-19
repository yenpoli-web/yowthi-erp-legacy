import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateReceivingItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
