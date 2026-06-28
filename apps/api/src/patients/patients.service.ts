import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

const SEX_MAP: Record<string, string> = {
  Male: 'M',
  Female: 'F',
  Child: 'C',
};

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  private generateMrn(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = String(Math.floor(10000 + Math.random() * 90000));
    return `HHDMS-${y}${m}${d}-${rand}`;
  }

  private splitName(full: string): [string, string] {
    const parts = full.trim().split(/\s+/);
    return [parts[0] ?? '', parts.slice(1).join(' ') || ''];
  }

  async register(dto: CreatePatientDto) {
    const existing = await this.prisma.patients.findFirst({
      where: { phone_number: dto.primary_phone },
    });
    if (existing) {
      throw new ConflictException(
        'A patient with this phone number already exists.',
      );
    }

    const [firstNameEn, lastNameEn] = this.splitName(dto.full_name_en);
    const [firstNameBn, lastNameBn] = this.splitName(dto.full_name_bn);

    const patient = await this.prisma.patients.create({
      data: {
        mrn: this.generateMrn(),
        first_name_en: firstNameEn,
        last_name_en: lastNameEn,
        first_name_bn: firstNameBn || null,
        last_name_bn: lastNameBn || null,
        date_of_birth: new Date(dto.date_of_birth),
        sex: SEX_MAP[dto.sex] ?? 'M',
        blood_group: dto.blood_group || null,
        phone_number: dto.primary_phone,
        address_line1: `Division: ${dto.division}, District: ${dto.district}, Thana: ${dto.thana}`,
        address_line2: dto.address_detail,
        district: dto.district,
        emergency_contact: dto.emergency_contact_phone,
        has_emergency_flag: dto.has_emergency_flag ?? false,
      },
    });

    return {
      id: patient.id,
      mrn: patient.mrn,
      message: 'Patient registered successfully.',
    };
  }

  async findById(id: string) {
    const patient = await this.prisma.patients.findUnique({
      where: { id },
      select: {
        id: true,
        mrn: true,
        first_name_en: true,
        last_name_en: true,
        first_name_bn: true,
        last_name_bn: true,
        sex: true,
        phone_number: true,
        district: true,
        date_of_birth: true,
        blood_group: true,
        address_line1: true,
        address_line2: true,
        has_emergency_flag: true,
      },
    });
    if (!patient) throw new NotFoundException('Patient not found.');
    return patient;
  }
}
