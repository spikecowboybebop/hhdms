import { Module } from '@nestjs/common';
import { SpecialistController } from './specialist.controller';
import { SpecialistService } from './specialist.service';
import { SpecialistPrescriptionService } from './specialist-prescription.service';
import { SpecialistDicomController } from './specialist-dicom.controller';
import { SpecialistDicomService } from './specialist-dicom.service';
import { SpecialistTemplateController } from './specialist-template.controller';
import { SpecialistTemplateService } from './specialist-template.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    SpecialistController,
    SpecialistDicomController,
    SpecialistTemplateController,
  ],
  providers: [
    SpecialistService,
    SpecialistPrescriptionService,
    SpecialistDicomService,
    SpecialistTemplateService,
  ],
})
export class SpecialistModule {}
