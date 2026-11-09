import { BadRequestException, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { join, resolve } from 'path';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const root = resolve(config.getOrThrow<string>('uploads.dir'));
        return {
          storage: diskStorage({
            destination: (_req, _file, cb) => {
              const month = new Date().toISOString().slice(0, 7);
              const dir = join(root, month);
              mkdirSync(dir, { recursive: true });
              cb(null, dir);
            },
            filename: (_req, _file, cb) => cb(null, `${randomUUID()}.upload`),
          }),
          limits: { fileSize: config.getOrThrow<number>('uploads.maxBytes'), files: 1 },
          fileFilter: (_req, file, cb) => {
            if (!/^image\/(jpeg|png|gif|webp|avif)$/.test(file.mimetype)) return cb(new BadRequestException('FILE_TYPE_NOT_ALLOWED'), false);
            cb(null, true);
          },
        };
      },
    }),
  ],
  controllers: [UploadsController],
})
export class UploadsModule {}
