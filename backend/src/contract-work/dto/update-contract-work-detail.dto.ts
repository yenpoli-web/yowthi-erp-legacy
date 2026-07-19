import { PartialType } from '@nestjs/mapped-types';
import { CreateContractWorkDetailDto } from './create-contract-work-detail.dto';
export class UpdateContractWorkDetailDto extends PartialType(CreateContractWorkDetailDto) {}