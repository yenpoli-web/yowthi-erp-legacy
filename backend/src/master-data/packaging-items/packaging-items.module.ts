import { Module } from '@nestjs/common';
import { PackagingItemsController } from './packaging-items.controller';
import { PackagingItemsService } from './packaging-items.service';

@Module({
  controllers: [PackagingItemsController],
  providers: [PackagingItemsService],
})
export class PackagingItemsModule {}
