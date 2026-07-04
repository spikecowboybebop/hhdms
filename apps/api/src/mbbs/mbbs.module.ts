import { Module } from '@nestjs/common';
import { MbbsController } from './mbbs.controller';
import { MbbsService } from './mbbs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [MbbsController],
  providers: [MbbsService],
  exports: [MbbsService],
})
export class MbbsModule {}
