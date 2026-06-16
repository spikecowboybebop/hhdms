import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

import * as dotenv from 'dotenv';
import * as path from 'path';

// Since .env is in apps/api, this path is perfect
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Parse the port explicitly to ensure it's a number
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

  // Force NestJS to listen on IPv4 localhost explicitly
  await app.listen(port, '127.0.0.1');
  
  console.log(`🚀 Nest application is running on: http://127.0.0.1:${port}`);
}
bootstrap();