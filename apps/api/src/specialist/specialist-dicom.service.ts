import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpecialistDicomService {
  constructor(private prisma: PrismaService) {}

  async findAll(patientId?: string) {
    const where = patientId ? { patient_id: patientId } : {};

    return this.prisma.specialist_dicom_studies.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.specialist_dicom_studies.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            date_of_birth: true,
            sex: true,
          },
        },
      },
    });
  }
}
