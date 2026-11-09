import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = configureApp(await NestFactory.create<NestExpressApplication>(AppModule));
  const port = app.get(ConfigService).getOrThrow<number>('port');
  await app.listen(port);
  Logger.log(`Wardrobe API ready at http://localhost:${port}/graphql`, 'Bootstrap');
}

void bootstrap();
