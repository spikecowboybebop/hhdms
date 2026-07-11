import { Module } from '@nestjs/common';
import { TeleconsultController } from './teleconsult.controller';
import { TeleconsultService } from './teleconsult.service';
import { TeleconsultGateway } from './teleconsult.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TeleconsultController],
  providers: [TeleconsultService, TeleconsultGateway],
})
export class TeleconsultModule {}
