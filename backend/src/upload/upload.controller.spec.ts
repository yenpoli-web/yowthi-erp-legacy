import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { PublicUploadController, UploadController } from './upload.controller';

describe('Upload controllers', () => {
  const originalWorkingDirectory = process.cwd();
  let workingDirectory: string;

  beforeAll(async () => {
    workingDirectory = await mkdtemp(join(tmpdir(), 'yowthi-upload-'));
    await mkdir(join(workingDirectory, 'public', 'uploads'), { recursive: true });
    process.chdir(workingDirectory);
  });

  afterAll(async () => {
    process.chdir(originalWorkingDirectory);
    await rm(workingDirectory, { recursive: true, force: true });
  });

  it('stores an allowed image with a server-generated extension', async () => {
    const controller = new UploadController();
    const request = {
      file: async () => ({
        filename: 'untrusted.html',
        mimetype: 'image/png',
        file: Readable.from(Buffer.from('png-test')),
      }),
    };

    const result = await controller.uploadFile(request);

    expect(result.url).toMatch(
      /^\/uploads\/[0-9a-f-]{36}\.png$/i,
    );
    await expect(
      readFile(join(workingDirectory, 'public', result.url)),
    ).resolves.toEqual(Buffer.from('png-test'));
  });

  it('rejects non-image uploads', async () => {
    const controller = new UploadController();
    const file = Readable.from(Buffer.from('<html>'));
    const request = {
      file: async () => ({
        filename: 'page.html',
        mimetype: 'text/html',
        file,
      }),
    };

    await expect(controller.uploadFile(request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('serves an existing image using a fixed image content type', async () => {
    const controller = new PublicUploadController();
    const filename = '123e4567-e89b-12d3-a456-426614174000.jpg';
    await writeFile(
      join(workingDirectory, 'public', 'uploads', filename),
      Buffer.from('jpg-test'),
    );

    const result = await controller.getFile(filename);

    expect(result.getHeaders()).toMatchObject({
      type: 'image/jpeg',
      disposition: `inline; filename="${filename}"`,
    });
  });

  it.each([
    '../secret.png',
    'not-a-uuid.png',
    '123e4567-e89b-12d3-a456-426614174000.html',
  ])('rejects an invalid public image path: %s', async (filename) => {
    const controller = new PublicUploadController();

    await expect(controller.getFile(filename)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns not found when a valid image name is absent', async () => {
    const controller = new PublicUploadController();

    await expect(
      controller.getFile('123e4567-e89b-12d3-a456-426614174001.webp'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
