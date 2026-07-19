import { PartialType } from '@nestjs/mapped-types';
import { CreateProcessingDetailDto } from './create-processing-detail.dto';
export class UpdateProcessingDetailDto extends PartialType(CreateProcessingDetailDto) {}
