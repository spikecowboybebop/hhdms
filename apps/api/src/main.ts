import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000', // URL of your Next.js frontend
    credentials: true, // Essential if you pass cookies/auth headers
  });

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
  await app.listen(port, '0.0.0.0');

  console.log(
    `🚀 Nest application is running on all network interfaces on port: ${port}`,
  );
  console.log(`🏠 Local Machine access: http://127.0.0.1:${port}`);
  console.log(`📱 Physical Phone access: http://192.168.0.105:${port}`);
}
void bootstrap();
