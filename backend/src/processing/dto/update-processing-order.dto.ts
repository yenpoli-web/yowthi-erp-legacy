import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessingOrderDto } from './create-processing-order.dto';
export class UpdateProcessingOrderDto extends PartialType(CreateProcessingOrderDto) {}
