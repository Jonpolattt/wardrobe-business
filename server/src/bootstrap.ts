import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { resolve } from 'path';

/** HTTP-level setup shared by the server entry point and the e2e tests. */
export function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService);
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(cookieParser());
  app.enableCors({ origin: config.getOrThrow<string[]>('clientOrigins'), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: false }));
  const uploadDir = resolve(config.getOrThrow<string>('uploads.dir'));
  mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
    index: false,
    dotfiles: 'deny',
    maxAge: '30d',
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  });
  app.enableShutdownHooks();
  return app;
}
