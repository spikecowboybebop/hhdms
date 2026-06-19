import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MbbsModule } from './mbbs/mbbs.module';
import { CallGateway } from './gateway/call.gateway';

@Module({
  imports: [PrismaModule, AuthModule, MbbsModule],
  controllers: [AppController],
  providers: [AppService, CallGateway],
})
export class AppModule {}
