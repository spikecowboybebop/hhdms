import { Module } from '@nestjs/common';
import { SpecialistController } from './specialist.controller';
import { SpecialistService } from './specialist.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SpecialistController],
  providers: [SpecialistService],
})
export class SpecialistModule {}
