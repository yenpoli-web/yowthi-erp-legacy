import {
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { pipeline } from 'stream/promises';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post()
  async uploadFile(@Req() req: any) {
    const data = await req.file();
    if (!data) throw new BadRequestException('No file uploaded');

    const ext = extname(data.filename) || '.bin';
    const filename = `${randomUUID()}${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');

    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    await pipeline(data.file, createWriteStream(join(uploadDir, filename)));

    return { url: `/uploads/${filename}` };
  }
}
