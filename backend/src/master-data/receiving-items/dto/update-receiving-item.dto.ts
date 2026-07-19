import { PartialType } from '@nestjs/mapped-types';
import { CreateReceivingItemDto } from './create-receiving-item.dto';

export class UpdateReceivingItemDto extends PartialType(CreateReceivingItemDto) {}
