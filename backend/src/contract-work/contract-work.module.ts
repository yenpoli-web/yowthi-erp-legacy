import { Module } from '@nestjs/common';
import { ContractWorkController } from './contract-work.controller';
import { ContractWorkService } from './contract-work.service';

@Module({
  controllers: [ContractWorkController],
  providers: [ContractWorkService],
})
export class ContractWorkModule {}