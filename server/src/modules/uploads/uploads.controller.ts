import { BadRequestException, Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { readFileSync, renameSync, unlinkSync } from 'fs';
import { extname, relative, resolve, sep } from 'path';

/** First bytes of the accepted image formats (the extension/mimetype alone is not trusted). */
const SIGNATURES: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', ext: '.jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', ext: '.png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: 'image/gif', ext: '.gif', test: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
  { mime: 'image/webp', ext: '.webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
  { mime: 'image/avif', ext: '.avif', test: (b) => b.subarray(4, 12).toString('ascii').startsWith('ftypavi') },
];

/**
 * REST is used only for file uploads (GraphQL keeps JSON-only requests).
 * Protected by the global auth guard: requires "Authorization: Bearer <access token>".
 */
@Controller('uploads')
export class UploadsController {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(config.getOrThrow<string>('uploads.dir'));
  }

  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('FILE_REQUIRED');
    const head = readFileSync(file.path).subarray(0, 16);
    const kind = SIGNATURES.find((s) => s.test(head));
    if (!kind) {
      unlinkSync(file.path);
      throw new BadRequestException('FILE_TYPE_NOT_ALLOWED');
    }
    let finalPath = file.path;
    if (extname(file.path) !== kind.ext) {
      finalPath = file.path.replace(/\.[^./\\]*$/, '') + kind.ext;
      renameSync(file.path, finalPath);
    }
    // URL relative to the configured upload root (served under /uploads/)
    const urlPath = relative(this.root, resolve(finalPath)).split(sep).join('/');
    return { url: `/uploads/${urlPath}`, size: file.size, mimeType: kind.mime };
  }
}
