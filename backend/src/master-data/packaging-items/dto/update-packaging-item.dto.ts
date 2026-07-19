import { PartialType } from '@nestjs/mapped-types';
import { CreatePackagingItemDto } from './create-packaging-item.dto';

export class UpdatePackagingItemDto extends PartialType(CreatePackagingItemDto) {}
