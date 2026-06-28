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

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MbbsModule,
    SpecialistModule,
    CaregiverModule,
    PatientsModule,
    BookingsModule,
  ],
  controllers: [AppController],
  providers: [AppService, CallGateway],
})
export class AppModule {}
