import { Module } from '@nestjs/common';
import { ProcessingItemsController } from './processing-items.controller';
import { ProcessingItemsService } from './processing-items.service';

@Module({
  controllers: [ProcessingItemsController],
  providers: [ProcessingItemsService],
})
export class ProcessingItemsModule {}
