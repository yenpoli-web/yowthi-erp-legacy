import { Module } from '@nestjs/common';
import { InventoryCostController } from './inventory-cost.controller';
import { InventoryCostService } from './inventory-cost.service';

@Module({
  controllers: [InventoryCostController],
  providers: [InventoryCostService],
})
export class InventoryCostModule {}
