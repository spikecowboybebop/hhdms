import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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
        booked_by: dto.booked_by || null,
      },
    });

    const phoneNumbers = [dto.primary_phone, dto.emergency_contact_phone].filter(Boolean);
    const phoneQueries = phoneNumbers.flatMap((num) => {
      const normalized = num.startsWith('+880')
        ? num
        : `+880${num.replace(/^0+/, '')}`;
      const alternate = num.startsWith('+880')
        ? `0${num.slice(3)}`
        : num;
      return [{ phoneNumber: num }, { phoneNumber: normalized }, { phoneNumber: alternate }];
    });
    const matchingUser = await this.prisma.user.findFirst({
      where: { OR: phoneQueries },
    });
    if (matchingUser) {
      await this.prisma.patients.update({
        where: { id: patient.id },
        data: { user_id: matchingUser.id },
      });
    }

    return {
      id: patient.id,
      mrn: patient.mrn,
      message: 'Patient registered successfully.',
    };
  }

  async findByBookedBy(email: string) {
    const patients = await this.prisma.patients.findMany({
      where: { booked_by: email },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        mrn: true,
        first_name_en: true,
        last_name_en: true,
        first_name_bn: true,
        last_name_bn: true,
        date_of_birth: true,
        sex: true,
        blood_group: true,
        phone_number: true,
        address_line1: true,
        address_line2: true,
        district: true,
        emergency_contact: true,
        booked_by: true,
      },
    });

    return patients.map((p) => ({
      id: p.id,
      mrn: p.mrn,
      full_name_en: `${p.first_name_en} ${p.last_name_en}`.trim(),
      full_name_bn: `${p.first_name_bn || ''} ${p.last_name_bn || ''}`.trim(),
      date_of_birth: p.date_of_birth?.toISOString().split('T')[0] || '',
      sex:
        p.sex === 'M'
          ? ('Male' as const)
          : p.sex === 'F'
            ? ('Female' as const)
            : ('Child' as const),
      blood_group: p.blood_group || '',
      primary_phone: p.phone_number || '',
      address_line1: p.address_line1 || '',
      address_line2: p.address_line2 || '',
      district: p.district || '',
      emergency_contact: p.emergency_contact || '',
    }));
  }

  async findOne(id: string) {
    const p = await this.prisma.patients.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Patient not found.');
    return p;
  }
}
