import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: CreatePatientDto) {
    // Check for duplicate phone
    const existing = await this.prisma.patients.findFirst({
      where: { phone_number: dto.primary_phone },
    });
    if (existing) {
      throw new ConflictException('A patient with this phone number already exists.');
    }

    // Split full name into first/last on first space
    const namePartsEn = dto.full_name_en.trim().split(/\s+/);
    const firstNameEn = namePartsEn[0] ?? '';
    const lastNameEn = namePartsEn.slice(1).join(' ') || '';

    const patient = await this.prisma.patients.create({
      data: {
        mrn: `MRN-${Date.now()}`,
        first_name_en: firstNameEn,
        last_name_en: lastNameEn,
        first_name_bn: dto.full_name_bn,
        date_of_birth: new Date(dto.date_of_birth),
        sex: dto.sex === 'Child' ? 'M' : dto.sex === 'Male' ? 'M' : 'F',
        blood_group: dto.blood_group ?? null,
        phone_number: dto.primary_phone,
        address_line1: `Division: ${dto.division}, District: ${dto.district}, Thana: ${dto.thana}`,
        address_line2: dto.address_detail,
        district: dto.district,
        emergency_contact: dto.emergency_contact_phone,
      },
    });

    return {
      id: patient.id,
      mrn: patient.mrn,
      message: 'Patient registered successfully.',
    };
  }
}
