import { Module } from '@nestjs/common';
import { SonologistController } from './sonologist.controller';
import { SonologistService } from './sonologist.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SonologistController],
  providers: [SonologistService],
  exports: [SonologistService],
})
export class SonologistModule {}
