import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

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
    const [firstNameEn, lastNameEn] = this.splitName(dto.full_name_en);
    const [firstNameBn, lastNameBn] = this.splitName(dto.full_name_bn);

    const data = {
      first_name_en: firstNameEn,
      last_name_en: lastNameEn,
      first_name_bn: firstNameBn || null,
      last_name_bn: lastNameBn || null,
      date_of_birth: new Date(dto.date_of_birth),
      sex: SEX_MAP[dto.sex] ?? 'M',
      blood_group: dto.blood_group || null,
      phone_number: dto.primary_phone,
      alternative_phone: dto.alternative_phone || null,
      address_line1: `Division: ${dto.division}, District: ${dto.district}, Thana: ${dto.thana}`,
      address_line2: dto.address_detail,
      district: dto.district,
      emergency_contact: dto.emergency_contact_phone,
      emergency_contact_name: dto.emergency_contact_name || null,
      emergency_contact_relation: dto.emergency_contact_relation || null,
      has_emergency_flag: dto.has_emergency_flag ?? false,
      booked_by: dto.booked_by || null,
    };

    const existing = await this.prisma.patients.findFirst({
      where: { phone_number: dto.primary_phone },
    });

    let patient: { id: string; mrn: string };

    if (existing) {
      patient = await this.prisma.patients.update({
        where: { id: existing.id },
        data,
        select: { id: true, mrn: true },
      });
    } else {
      const userByEmail = dto.booked_by
        ? await this.prisma.user.findUnique({ where: { email: dto.booked_by } })
        : null;
      const existingByEmail = userByEmail
        ? await this.prisma.patients.findFirst({
            where: { OR: [{ user_id: userByEmail.id }, { phone_number: userByEmail.phoneNumber }] },
          })
        : null;

      if (existingByEmail) {
        const phoneTakenByOther = dto.primary_phone
          ? await this.prisma.patients.findFirst({
              where: { phone_number: dto.primary_phone, id: { not: existingByEmail.id } },
            })
          : null;
        if (phoneTakenByOther) {
          throw new ConflictException('This phone number is already in use by another patient.');
        }

        patient = await this.prisma.patients.update({
          where: { id: existingByEmail.id },
          data,
          select: { id: true, mrn: true },
        });
      } else {
        const phoneTaken = dto.primary_phone
          ? await this.prisma.patients.findFirst({ where: { phone_number: dto.primary_phone } })
          : null;
        if (phoneTaken) {
          throw new ConflictException('This phone number is already in use by another patient.');
        }

        patient = await this.prisma.patients.create({
          data: {
            ...data,
            mrn: this.generateMrn(),
          },
          select: { id: true, mrn: true },
        });
      }
    }

    const phoneNumbers = [
      dto.primary_phone,
      dto.emergency_contact_phone,
    ].filter(Boolean);
    const phoneQueries = phoneNumbers.flatMap((num) => {
      const normalized = num.startsWith('+880')
        ? num
        : `+880${num.replace(/^0+/, '')}`;
      const alternate = num.startsWith('+880') ? `0${num.slice(3)}` : num;
      return [
        { phoneNumber: num },
        { phoneNumber: normalized },
        { phoneNumber: alternate },
      ];
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
      message: existing
        ? 'Patient info updated successfully.'
        : 'Patient registered successfully.',
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
        alternative_phone: true,
        address_line1: true,
        address_line2: true,
        district: true,
        emergency_contact: true,
        emergency_contact_name: true,
        emergency_contact_relation: true,
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
      alternative_phone: p.alternative_phone || '',
      address_line1: p.address_line1 || '',
      address_line2: p.address_line2 || '',
      district: p.district || '',
      emergency_contact: p.emergency_contact || '',
      emergency_contact_name: p.emergency_contact_name || '',
      emergency_contact_relation: p.emergency_contact_relation || '',
    }));
  }

  async findByPhone(phone: string) {
    const variants = [
      phone,
      `+880${phone.replace(/^0+/, '')}`,
      phone.startsWith('+880') ? `0${phone.slice(3)}` : phone,
    ];
    const p = await this.prisma.patients.findFirst({
      where: { phone_number: { in: variants } },
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
        alternative_phone: true,
        address_line1: true,
        address_line2: true,
        district: true,
        emergency_contact: true,
        emergency_contact_name: true,
        emergency_contact_relation: true,
        booked_by: true,
      },
    });
    if (!p) throw new NotFoundException('Patient not found.');
    return {
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
      alternative_phone: p.alternative_phone || '',
      address_line1: p.address_line1 || '',
      address_line2: p.address_line2 || '',
      district: p.district || '',
      emergency_contact: p.emergency_contact || '',
      emergency_contact_name: p.emergency_contact_name || '',
      emergency_contact_relation: p.emergency_contact_relation || '',
    };
  }

  async findOne(id: string) {
    const p = await this.prisma.patients.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Patient not found.');
    return p;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, phoneNumber: true },
    });
    if (!user) throw new NotFoundException('User not found for this email.');

    const p = await this.prisma.patients.findFirst({
      where: { OR: [{ user_id: user.id }, { phone_number: user.phoneNumber }] },
      orderBy: { created_at: 'desc' },
      select: {
        id: true, mrn: true,
        first_name_en: true, last_name_en: true,
        first_name_bn: true, last_name_bn: true,
        date_of_birth: true,
        sex: true, blood_group: true,
        phone_number: true, alternative_phone: true,
        address_line1: true, address_line2: true,
        district: true,
        emergency_contact: true,
        emergency_contact_name: true,
        emergency_contact_relation: true,
        booked_by: true,
      },
    });

    if (!p) throw new NotFoundException('Patient not found for this user.');

    return {
      id: p.id,
      mrn: p.mrn,
      full_name_en: `${p.first_name_en} ${p.last_name_en}`.trim(),
      full_name_bn: `${p.first_name_bn || ''} ${p.last_name_bn || ''}`.trim(),
      date_of_birth: p.date_of_birth?.toISOString().split('T')[0] || '',
      sex: p.sex === 'M' ? ('Male' as const) : p.sex === 'F' ? ('Female' as const) : ('Child' as const),
      blood_group: p.blood_group || '',
      primary_phone: p.phone_number || '',
      alternative_phone: p.alternative_phone || '',
      address_line1: p.address_line1 || '',
      address_line2: p.address_line2 || '',
      district: p.district || '',
      emergency_contact: p.emergency_contact || '',
      emergency_contact_name: p.emergency_contact_name || '',
      emergency_contact_relation: p.emergency_contact_relation || '',
    };
  }

  async update(id: string, dto: UpdatePatientDto) {
    const existing = await this.prisma.patients.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Patient not found.');

    const [firstNameEn, lastNameEn] = dto.full_name_en
      ? this.splitName(dto.full_name_en)
      : [existing.first_name_en, existing.last_name_en];
    const [firstNameBn, lastNameBn] = dto.full_name_bn
      ? this.splitName(dto.full_name_bn)
      : [existing.first_name_bn || '', existing.last_name_bn || ''];

    const data: Record<string, unknown> = {};

    if (dto.full_name_en) {
      data.first_name_en = firstNameEn;
      data.last_name_en = lastNameEn;
    }
    if (dto.full_name_bn) {
      data.first_name_bn = firstNameBn || null;
      data.last_name_bn = lastNameBn || null;
    }
    if (dto.date_of_birth) data.date_of_birth = new Date(dto.date_of_birth);
    if (dto.sex) data.sex = SEX_MAP[dto.sex] ?? existing.sex;
    if (dto.blood_group !== undefined) data.blood_group = dto.blood_group || null;
    if (dto.primary_phone) data.phone_number = dto.primary_phone;
    if (dto.alternative_phone !== undefined)
      data.alternative_phone = dto.alternative_phone || null;
    if (dto.division || dto.district || dto.thana) {
      const division = dto.division ?? this.extractAddressPart(existing.address_line1, 'Division');
      const district = dto.district ?? this.extractAddressPart(existing.address_line1, 'District');
      const thana = dto.thana ?? this.extractAddressPart(existing.address_line1, 'Thana');
      data.address_line1 = `Division: ${division}, District: ${district}, Thana: ${thana}`;
    }
    if (dto.district) data.district = dto.district;
    if (dto.address_detail !== undefined)
      data.address_line2 = dto.address_detail || null;
    if (dto.emergency_contact_name !== undefined)
      data.emergency_contact_name = dto.emergency_contact_name || null;
    if (dto.emergency_contact_relation !== undefined)
      data.emergency_contact_relation = dto.emergency_contact_relation || null;
    if (dto.emergency_contact_phone)
      data.emergency_contact = dto.emergency_contact_phone;
    if (dto.has_emergency_flag !== undefined)
      data.has_emergency_flag = dto.has_emergency_flag;
    if (dto.booked_by !== undefined) data.booked_by = dto.booked_by || null;

    if (dto.primary_phone && dto.primary_phone !== existing.phone_number) {
      const phoneTaken = await this.prisma.patients.findFirst({
        where: { phone_number: dto.primary_phone, id: { not: id } },
      });
      if (phoneTaken) {
        throw new ConflictException('This phone number is already in use by another patient.');
      }
    }

    await this.prisma.patients.update({
      where: { id },
      data,
    });

    return { message: 'Patient info updated successfully.' };
  }

  async getSelfDocuments(userId: string) {
    const patient = await this.prisma.patients.findFirst({
      where: { user_id: userId },
    });
    if (!patient) throw new NotFoundException('Patient record not found.');
    return this.prisma.patient_documents.findMany({
      where: { patient_id: patient.id },
      orderBy: { uploaded_at: 'desc' },
    });
  }

  async uploadSelfDocument(userId: string, file: Express.Multer.File) {
    const patient = await this.prisma.patients.findFirst({
      where: { user_id: userId },
    });
    if (!patient) throw new NotFoundException('Patient record not found.');

    const cdnBase = process.env.UPLOADCARE_CDN_BASE || 'https://ucarecdn.com';
    const formData = new FormData();
    formData.append('UPLOADCARE_PUB_KEY', process.env.UPLOADCARE_PUB_KEY!);
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });
    formData.append('file', blob, file.originalname);

    const ucRes = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: formData,
    });

    if (!ucRes.ok) {
      const body = await ucRes.text().catch(() => '');
      throw new BadRequestException(
        `UploadCare upload failed: ${ucRes.status} ${body}`,
      );
    }

    const ucData = (await ucRes.json()) as { file: string };
    const fileUrl = `${cdnBase}/${ucData.file}/${file.originalname}`;

    const document = await this.prisma.patient_documents.create({
      data: {
        patient_id: patient.id,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_url: fileUrl,
      },
    });

    return document;
  }

  private extractAddressPart(
    addressLine1: string | null,
    label: string,
  ): string {
    const re = new RegExp(`${label}:\\s*([^,]+)`, 'i');
    const m = (addressLine1 ?? '').match(re);
    return m?.[1]?.trim() ?? '';
  }
}
