import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Post,
  Req,
  StreamableFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { pipeline } from 'stream/promises';
import { createReadStream, createWriteStream, mkdirSync, existsSync } from 'fs';
import { stat } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const IMAGE_EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const IMAGE_CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const PUBLIC_IMAGE_FILENAME =
  /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\.(?:jpe?g|png|webp)$/i;

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post()
  async uploadFile(@Req() req: any) {
    const data = await req.file();
    if (!data) throw new BadRequestException('No file uploaded');

    const ext = IMAGE_EXTENSIONS[data.mimetype];
    if (!ext) {
      data.file.resume();
      throw new BadRequestException('Only PNG, JPEG, and WebP images are allowed');
    }

    const filename = `${randomUUID()}${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');

    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    await pipeline(data.file, createWriteStream(join(uploadDir, filename)));

    return { url: `/uploads/${filename}` };
  }
}

@Controller('uploads')
export class PublicUploadController {
  @Get(':filename')
  @Header('X-Content-Type-Options', 'nosniff')
  async getFile(@Param('filename') filename: string) {
    if (!PUBLIC_IMAGE_FILENAME.test(filename)) {
      throw new NotFoundException('Image not found');
    }

    const filePath = join(process.cwd(), 'public', 'uploads', filename);

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) throw new NotFoundException('Image not found');
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('Image not found');
    }

    const extension = extname(filename).toLowerCase();
    return new StreamableFile(createReadStream(filePath), {
      type: IMAGE_CONTENT_TYPES[extension],
      disposition: `inline; filename="${filename}"`,
    });
  }
}
