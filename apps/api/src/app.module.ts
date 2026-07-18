import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MbbsModule } from './mbbs/mbbs.module';
import { CallGateway } from './gateway/call.gateway';
import { SpecialistModule } from './specialist/specialist.module';
import { CaregiverModule } from './caregiver/caregiver.module';
import { PatientsModule } from './patients/patients.module';
import { BookingsModule } from './bookings/bookings.module';
import { NutritionistModule } from './nutritionist/nutritionist.module';
import { SonologistModule } from './sonologist/sonologist.module';
import { ProvidersModule } from './providers/providers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { ChatModule } from './chat/chat.module';
import { VideoCallModule } from './video-call/video-call.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MbbsModule,
    SpecialistModule,
    CaregiverModule,
    PatientsModule,
    NutritionistModule,
    BookingsModule,
    SonologistModule,
    ProvidersModule,
    NotificationsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, CallGateway],
})
export class AppModule {}
