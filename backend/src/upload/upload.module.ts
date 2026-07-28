import { Module } from '@nestjs/common';
import { PublicUploadController, UploadController } from './upload.controller';

@Module({
  controllers: [UploadController, PublicUploadController],
})
export class UploadModule {}
