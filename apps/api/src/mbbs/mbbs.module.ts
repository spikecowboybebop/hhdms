import { Module } from '@nestjs/common';
import { MbbsController } from './mbbs.controller';
import { MbbsService } from './mbbs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MbbsController],
  providers: [MbbsService],
  exports: [MbbsService],
})
export class MbbsModule {}