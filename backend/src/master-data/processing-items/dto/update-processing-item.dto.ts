import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateProcessingItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
