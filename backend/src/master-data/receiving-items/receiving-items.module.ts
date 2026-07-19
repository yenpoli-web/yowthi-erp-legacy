import { Module } from '@nestjs/common';
import { ReceivingItemsController } from './receiving-items.controller';
import { ReceivingItemsService } from './receiving-items.service';

@Module({
  controllers: [ReceivingItemsController],
  providers: [ReceivingItemsService],
})
export class ReceivingItemsModule {}
