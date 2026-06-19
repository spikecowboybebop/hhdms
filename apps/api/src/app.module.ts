import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MbbsModule } from './mbbs/mbbs.module';
import { SpecialistModule } from './specialist/specialist.module';

@Module({
  imports: [PrismaModule, AuthModule, MbbsModule, SpecialistModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
