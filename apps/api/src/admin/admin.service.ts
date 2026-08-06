import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto, UpdateStaffDto } from './dto';
import { AdminAuditService, type AuditActor } from './admin.audit.service';
import { BillingService } from '../billing/billing.service';

type Tx = Prisma.TransactionClient;

const PASSWORD_POLICY =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{10,}$/;

// Which staff role provides each bookable service type. Sonologist is
// intentionally excluded from admin-managed reassignment.
const SERVICE_PROVIDER_ROLE: Record<string, string> = {
  MBBS: 'MBBS_DOCTOR',
  SPECIALIST: 'SPECIALIST',
  CAREGIVER: 'CAREGIVER',
  NUTRITIONIST: 'NUTRITIONIST',
  NURSE: 'NURSE',
};

const SERVICE_PROVIDER_ROLES: string[] = Object.values(SERVICE_PROVIDER_ROLE);

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly billing: BillingService,
  ) {}

  // ═══════════════════════════════════════════════════════════
  // Shared helpers
  // ═══════════════════════════════════════════════════════════

  private generateTempPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const specials = '!@#$%^&*';
    const all = upper + lower + digits + specials;
    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
    const chars = [pick(upper), pick(lower), pick(digits), pick(specials)];
    for (let i = chars.length; i < 12; i++) {
      chars.push(pick(all));
    }
    // Fisher–Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const password = chars.join('');
    if (!PASSWORD_POLICY.test(password)) {
      return this.generateTempPassword();
    }
    return password;
  }

  private normalizePhone(phone: string): string {
    if (phone.startsWith('+880')) return phone;
    if (phone.startsWith('880')) return `+${phone}`;
    if (phone.startsWith('0')) return `+880${phone.slice(1)}`;
    return `+880${phone}`;
  }

  private isStaffRole(role: string): boolean {
    return [
      'MBBS_DOCTOR',
      'SPECIALIST',
      'NURSE',
      'CAREGIVER',
      'NUTRITIONIST',
    ].includes(role);
  }

  private roleIdFor(name: string): Promise<number | null> {
    return this.prisma.role
      .findUnique({ where: { name }, select: { id: true } })
      .then((r) => r?.id ?? null);
  }

  private valueStr(v: unknown): string {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v.toISOString();
    return JSON.stringify(v);
  }

  private normalizedValue(v: unknown): unknown {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object' && 'toJSON' in v) {
      return (v as { toJSON(): string | number }).toJSON();
    }
    return v;
  }

  private flatStaff(staff: any): Record<string, unknown> {
    return {
      email: staff.email,
      phone_number: staff.phone_number ?? staff.phoneNumber,
      first_name_en: staff.first_name_en,
      last_name_en: staff.last_name_en,
      first_name_bn: staff.first_name_bn,
      last_name_bn: staff.last_name_bn,
      nid: staff.nid,
      photo_url: staff.photo_url,
      ...(staff.profile ?? {}),
    };
  }

  private staffDiff(before: any, after: any): Record<string, unknown> {
    const b = this.flatStaff(before);
    const a = this.flatStaff(after);
    // DB bookkeeping columns that change on every write — never a meaningful change.
    const skip = new Set([
      'id',
      'user_id',
      'userId',
      'created_at',
      'createdAt',
      'updated_at',
      'updatedAt',
    ]);
    const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter(
      (k) => !skip.has(k),
    );
    const changed: Record<string, unknown> = {};
    for (const key of keys) {
      if (this.valueStr(a[key]) !== this.valueStr(b[key])) {
        changed[key] = this.normalizedValue(a[key]);
      }
    }
    return changed;
  }

  // ═══════════════════════════════════════════════════════════
  // GET /admin/roles
  // ═══════════════════════════════════════════════════════════
  async listStaffRoles() {
    const roles = await this.prisma.role.findMany({
      where: {
        name: {
          in: [
            'MBBS_DOCTOR',
            'SPECIALIST',
            'NURSE',
            'CAREGIVER',
            'NUTRITIONIST',
          ],
        },
      },
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
    return { roles };
  }

  // ═══════════════════════════════════════════════════════════
  // POST /admin/staff
  // ═══════════════════════════════════════════════════════════
  async createStaff(dto: CreateStaffDto, actor?: AuditActor) {
    if (!this.isStaffRole(dto.role)) {
      throw new BadRequestException(`Role "${dto.role}" is not a staff role.`);
    }

    const roleId = await this.roleIdFor(dto.role);
    if (!roleId) {
      throw new BadRequestException(`Role "${dto.role}" is not configured.`);
    }

    const phone = this.normalizePhone(dto.phone_number);

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phoneNumber: phone }] },
      select: { email: true, phoneNumber: true },
    });
    if (existing) {
      const clash =
        existing.email === dto.email ? 'email address' : 'phone number';
      throw new ConflictException(`A user with this ${clash} already exists.`);
    }

    // Enforce per-role unique license / BMDC / BNMC when supplied
    if (dto.bmdc_registration) {
      const clash = await this.findBmdcClash(dto.bmdc_registration);
      if (clash) {
        throw new ConflictException(
          'This BMDC registration number is already in use.',
        );
      }
    }
    if (dto.bnmc_registration) {
      const clash = await this.prisma.nurse_profiles.findUnique({
        where: { bnmc_registration: dto.bnmc_registration },
        select: { user_id: true },
      });
      if (clash) {
        throw new ConflictException(
          'This BNMC registration number is already in use.',
        );
      }
    }
    if (dto.license_number) {
      const clash = await this.findLicenseClash(dto.license_number, dto.role);
      if (clash) {
        throw new ConflictException('This license number is already in use.');
      }
    }

    const password = this.generateTempPassword();
    const bcrypt = await import('bcrypt');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash: await bcrypt.hash(password, 10),
          phoneNumber: phone,
          firstNameEn: dto.first_name_en,
          lastNameEn: dto.last_name_en,
          firstNameBn: dto.first_name_bn ?? null,
          lastNameBn: dto.last_name_bn ?? null,
          nid: dto.nid ?? null,
          photoUrl: dto.photo_url ?? null,
          roleId,
          status: 'ACTIVE',
          mfaEnabled: false,
          passwordChangedAt: null,
        },
        select: { id: true, email: true },
      });

      await this.createProfile(tx, dto, user.id);

      if (actor) {
        await this.audit.record({
          actor,
          action: 'CREATE_STAFF',
          entityType: 'staff',
          entityId: user.id,
          changes: {
            email: user.email,
            role: dto.role,
            phone: phone,
          },
        });
      }

      return {
        id: user.id,
        email: user.email,
        role: dto.role,
        message: `Staff ${dto.role} profile created successfully.`,
        temporary_password: password,
        require_password_change: true,
      };
    });
  }

  private async findBmdcClash(bmdc: string) {
    const [mbbs, specialist] = await Promise.all([
      this.prisma.mbbs_doctor_profiles.findUnique({
        where: { bmdc_registration: bmdc },
        select: { user_id: true },
      }),
      this.prisma.specialist_profiles.findUnique({
        where: { bmdc_registration: bmdc },
        select: { user_id: true },
      }),
    ]);
    return mbbs ?? specialist;
  }

  private async findLicenseClash(license: string, role: string) {
    if (role === 'MBBS_DOCTOR') {
      return this.prisma.mbbs_doctor_profiles.findUnique({
        where: { license_number: license },
        select: { user_id: true },
      });
    }
    if (role === 'SPECIALIST') {
      return this.prisma.specialist_profiles.findUnique({
        where: { license_number: license },
        select: { user_id: true },
      });
    }
    if (role === 'NURSE') {
      return this.prisma.nurse_profiles.findFirst({
        where: { license_number: license },
        select: { user_id: true },
      });
    }
    return null;
  }

  private async createProfile(tx: Tx, dto: CreateStaffDto, userId: string) {
    switch (dto.role) {
      case 'MBBS_DOCTOR':
        await tx.mbbs_doctor_profiles.create({
          data: {
            user_id: userId,
            license_number:
              dto.license_number ?? `BMDC-LIC-${userId.slice(0, 8)}`,
            bmdc_registration: dto.bmdc_registration ?? null,
            specialization: dto.specialization ?? null,
            qualification: dto.qualification ?? null,
            years_of_experience: dto.years_of_experience ?? null,
            consultation_fee: dto.consultation_fee ?? null,
            signature_url: dto.signature_url ?? null,
            district: dto.district ?? null,
            thana: dto.thana ?? null,
            service_area: dto.service_area ?? null,
            is_available: true,
          },
        });
        break;
      case 'SPECIALIST':
        if (!dto.specialty_code) {
          throw new BadRequestException(
            'specialty_code is required for Specialist profiles.',
          );
        }
        await tx.specialist_profiles.create({
          data: {
            user_id: userId,
            license_number:
              dto.license_number ?? `BMDC-SPC-${userId.slice(0, 8)}`,
            bmdc_registration: dto.bmdc_registration ?? null,
            specialty_code: dto.specialty_code,
            qualification: dto.qualification ?? null,
            years_of_experience: dto.years_of_experience ?? null,
            consultation_fee: dto.consultation_fee ?? null,
            signature_url: dto.signature_url ?? null,
            sub_specialties: dto.sub_specialties ?? null,
            service_area: dto.service_area ?? null,
            is_available: true,
          },
        });
        break;
      case 'NURSE':
        await tx.nurse_profiles.create({
          data: {
            user_id: userId,
            nurse_type: dto.nurse_type ?? 'ADULT',
            specialization: dto.specialization ?? null,
            license_number: dto.license_number ?? null,
            bnmc_registration: dto.bnmc_registration ?? null,
            qualifications: dto.qualifications ?? null,
            skills: dto.skills ?? null,
            shift_preference: dto.shift_preference ?? null,
            gps_device_id: dto.gps_device_id ?? null,
          },
        });
        break;
      case 'CAREGIVER':
        await tx.caregiver_profiles.create({
          data: {
            user_id: userId,
            gender: dto.gender ?? null,
            experience_years: dto.years_of_experience ?? null,
            specializations: dto.specializations ?? null,
            verification_status: 'PENDING',
            training_certs: dto.training_certs ?? null,
            phone_number: dto.phone_number,
            address: dto.address ?? null,
            is_available: true,
          },
        });
        break;
      case 'NUTRITIONIST':
        await tx.nutritionist_profiles.create({
          data: {
            user_id: userId,
            qualifications: dto.qualifications ?? null,
            specializations: dto.specializations ?? null,
            service_area: dto.service_area ?? null,
            consultation_fee: dto.consultation_fee ?? null,
            is_available: true,
          },
        });
        break;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GET /admin/staff
  // ═══════════════════════════════════════════════════════════
  async listStaff(filters: {
    role?: string;
    status?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const requestedPage = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));

    const where: any = {
      role: {
        name: {
          in: [
            'MBBS_DOCTOR',
            'SPECIALIST',
            'NURSE',
            'CAREGIVER',
            'NUTRITIONIST',
          ],
        },
      },
    };
    if (filters.role && this.isStaffRole(filters.role)) {
      where.role.name = filters.role;
    }
    if (filters.status && ['ACTIVE', 'SUSPENDED'].includes(filters.status)) {
      where.status = filters.status;
    }
    if (filters.q) {
      const tokens = filters.q.trim().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        where.AND = tokens.map((token) => ({
          OR: [
            { firstNameEn: { contains: token, mode: 'insensitive' } },
            { lastNameEn: { contains: token, mode: 'insensitive' } },
            { email: { contains: token, mode: 'insensitive' } },
            { phoneNumber: { contains: token, mode: 'insensitive' } },
          ],
        }));
      }
    }

    const total = await this.prisma.user.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const skip = (page - 1) * pageSize;

    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        firstNameEn: true,
        lastNameEn: true,
        nid: true,
        photoUrl: true,
        status: true,
        createdAt: true,
        role: { select: { name: true } },
        mbbs_doctor_profiles: {
          select: {
            license_number: true,
            bmdc_registration: true,
            specialization: true,
            is_available: true,
            consultation_fee: true,
          },
        },
        specialist_profiles: {
          select: {
            license_number: true,
            bmdc_registration: true,
            specialty_code: true,
            is_available: true,
            consultation_fee: true,
          },
        },
        nurse_profiles: {
          select: {
            nurse_type: true,
            specialization: true,
            license_number: true,
            bnmc_registration: true,
          },
        },
        caregiver_profiles: {
          select: {
            gender: true,
            verification_status: true,
            is_available: true,
          },
        },
        nutritionist_profiles: {
          select: {
            qualifications: true,
            specializations: true,
            is_available: true,
            consultation_fee: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const staff = users.map((u) => {
      const profile =
        u.mbbs_doctor_profiles ??
        u.specialist_profiles ??
        u.nurse_profiles ??
        u.caregiver_profiles ??
        u.nutritionist_profiles;
      const isAvailable =
        profile && 'is_available' in profile ? profile.is_available : null;
      return {
        id: u.id,
        email: u.email,
        phone_number: u.phoneNumber,
        first_name_en: u.firstNameEn,
        last_name_en: u.lastNameEn,
        nid: u.nid,
        photo_url: u.photoUrl,
        status: u.status,
        role: u.role.name,
        created_at: u.createdAt,
        is_available: isAvailable,
        profile,
      };
    });

    return {
      staff,
      count: staff.length,
      total,
      page,
      pageSize,
      pageCount,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET /admin/staff/:id
  // ═══════════════════════════════════════════════════════════
  async getStaff(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        firstNameEn: true,
        lastNameEn: true,
        firstNameBn: true,
        lastNameBn: true,
        nid: true,
        photoUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { name: true } },
        mbbs_doctor_profiles: true,
        specialist_profiles: true,
        nurse_profiles: true,
        caregiver_profiles: true,
        nutritionist_profiles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Staff member not found.');
    }

    const {
      mbbs_doctor_profiles,
      specialist_profiles,
      nurse_profiles,
      caregiver_profiles,
      nutritionist_profiles,
      ...base
    } = user;

    const profile =
      mbbs_doctor_profiles ??
      specialist_profiles ??
      nurse_profiles ??
      caregiver_profiles ??
      nutritionist_profiles;

    return {
      ...base,
      phone_number: base.phoneNumber,
      first_name_en: base.firstNameEn,
      last_name_en: base.lastNameEn,
      first_name_bn: base.firstNameBn,
      last_name_bn: base.lastNameBn,
      nid: base.nid,
      photo_url: base.photoUrl,
      role: base.role.name,
      profile,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH /admin/staff/:id
  // ═══════════════════════════════════════════════════════════
  async updateStaff(id: string, dto: UpdateStaffDto, actor?: AuditActor) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        role: { select: { name: true } },
      },
    });
    if (!existing) {
      throw new NotFoundException('Staff member not found.');
    }

    if (dto.email && dto.email !== existing.email) {
      const clash = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });
      if (clash)
        throw new ConflictException('This email address is already in use.');
    }
    if (dto.phone_number) {
      const phone = this.normalizePhone(dto.phone_number);
      const clash = await this.prisma.user.findUnique({
        where: { phoneNumber: phone },
        select: { id: true },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException('This phone number is already in use.');
      }
    }

    const before = await this.getStaff(id);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.email ? { email: dto.email } : {}),
          ...(dto.phone_number
            ? { phoneNumber: this.normalizePhone(dto.phone_number) }
            : {}),
          ...(dto.first_name_en ? { firstNameEn: dto.first_name_en } : {}),
          ...(dto.last_name_en ? { lastNameEn: dto.last_name_en } : {}),
          ...(dto.first_name_bn !== undefined
            ? { firstNameBn: dto.first_name_bn || null }
            : {}),
          ...(dto.last_name_bn !== undefined
            ? { lastNameBn: dto.last_name_bn || null }
            : {}),
          ...(dto.nid !== undefined ? { nid: dto.nid || null } : {}),
          ...(dto.photo_url !== undefined
            ? { photoUrl: dto.photo_url || null }
            : {}),
        },
      });

      await this.updateProfile(tx, existing.role.name, id, dto);
    });

    const after = await this.getStaff(id);

    if (actor) {
      const changes = this.staffDiff(before, after);
      if (Object.keys(changes).length > 0) {
        await this.audit.record({
          actor,
          action: 'UPDATE_STAFF',
          entityType: 'staff',
          entityId: id,
          changes,
        });
      }
    }

    return after;
  }

  private async updateProfile(
    tx: Tx,
    role: string,
    userId: string,
    dto: UpdateStaffDto,
  ) {
    const pick = <K extends keyof UpdateStaffDto>(
      key: K,
    ): UpdateStaffDto[K] | undefined => dto[key];

    switch (role) {
      case 'MBBS_DOCTOR':
        await tx.mbbs_doctor_profiles.update({
          where: { user_id: userId },
          data: {
            ...(pick('license_number') !== undefined
              ? { license_number: pick('license_number') }
              : {}),
            ...(pick('bmdc_registration') !== undefined
              ? { bmdc_registration: pick('bmdc_registration') || null }
              : {}),
            ...(pick('specialization') !== undefined
              ? { specialization: pick('specialization') || null }
              : {}),
            ...(pick('qualification') !== undefined
              ? { qualification: pick('qualification') || null }
              : {}),
            ...(pick('years_of_experience') !== undefined
              ? { years_of_experience: pick('years_of_experience') }
              : {}),
            ...(pick('consultation_fee') !== undefined
              ? { consultation_fee: pick('consultation_fee') }
              : {}),
            ...(pick('signature_url') !== undefined
              ? { signature_url: pick('signature_url') || null }
              : {}),
            ...(pick('district') !== undefined
              ? { district: pick('district') || null }
              : {}),
            ...(pick('thana') !== undefined
              ? { thana: pick('thana') || null }
              : {}),
            ...(pick('service_area') !== undefined
              ? { service_area: pick('service_area') || null }
              : {}),
            ...(pick('is_available') !== undefined
              ? { is_available: pick('is_available') }
              : {}),
          },
        });
        break;
      case 'SPECIALIST':
        await tx.specialist_profiles.update({
          where: { user_id: userId },
          data: {
            ...(pick('license_number') !== undefined
              ? { license_number: pick('license_number') }
              : {}),
            ...(pick('bmdc_registration') !== undefined
              ? { bmdc_registration: pick('bmdc_registration') || null }
              : {}),
            ...(pick('specialty_code') !== undefined
              ? { specialty_code: pick('specialty_code') }
              : {}),
            ...(pick('qualification') !== undefined
              ? { qualification: pick('qualification') || null }
              : {}),
            ...(pick('years_of_experience') !== undefined
              ? { years_of_experience: pick('years_of_experience') }
              : {}),
            ...(pick('consultation_fee') !== undefined
              ? { consultation_fee: pick('consultation_fee') }
              : {}),
            ...(pick('signature_url') !== undefined
              ? { signature_url: pick('signature_url') || null }
              : {}),
            ...(pick('sub_specialties') !== undefined
              ? { sub_specialties: pick('sub_specialties') || null }
              : {}),
            ...(pick('service_area') !== undefined
              ? { service_area: pick('service_area') || null }
              : {}),
            ...(pick('is_available') !== undefined
              ? { is_available: pick('is_available') }
              : {}),
          },
        });
        break;
      case 'NURSE':
        await tx.nurse_profiles.update({
          where: { user_id: userId },
          data: {
            ...(pick('nurse_type') !== undefined
              ? { nurse_type: pick('nurse_type') }
              : {}),
            ...(pick('specialization') !== undefined
              ? { specialization: pick('specialization') || null }
              : {}),
            ...(pick('license_number') !== undefined
              ? { license_number: pick('license_number') || null }
              : {}),
            ...(pick('bnmc_registration') !== undefined
              ? { bnmc_registration: pick('bnmc_registration') || null }
              : {}),
            ...(pick('qualifications') !== undefined
              ? { qualifications: pick('qualifications') || null }
              : {}),
            ...(pick('skills') !== undefined
              ? { skills: pick('skills') || null }
              : {}),
            ...(pick('shift_preference') !== undefined
              ? { shift_preference: pick('shift_preference') }
              : {}),
            ...(pick('gps_device_id') !== undefined
              ? { gps_device_id: pick('gps_device_id') || null }
              : {}),
          },
        });
        break;
      case 'CAREGIVER':
        await tx.caregiver_profiles.update({
          where: { user_id: userId },
          data: {
            ...(pick('gender') !== undefined
              ? { gender: pick('gender') || null }
              : {}),
            ...(pick('years_of_experience') !== undefined
              ? { experience_years: pick('years_of_experience') }
              : {}),
            ...(pick('specializations') !== undefined
              ? { specializations: pick('specializations') || null }
              : {}),
            ...(pick('training_certs') !== undefined
              ? { training_certs: pick('training_certs') || null }
              : {}),
            ...(pick('address') !== undefined
              ? { address: pick('address') || null }
              : {}),
            ...(pick('phone_number') !== undefined
              ? { phone_number: pick('phone_number') }
              : {}),
            ...(pick('is_available') !== undefined
              ? { is_available: pick('is_available') }
              : {}),
          },
        });
        break;
      case 'NUTRITIONIST':
        await tx.nutritionist_profiles.update({
          where: { user_id: userId },
          data: {
            ...(pick('qualifications') !== undefined
              ? { qualifications: pick('qualifications') || null }
              : {}),
            ...(pick('specializations') !== undefined
              ? { specializations: pick('specializations') || null }
              : {}),
            ...(pick('service_area') !== undefined
              ? { service_area: pick('service_area') || null }
              : {}),
            ...(pick('consultation_fee') !== undefined
              ? { consultation_fee: pick('consultation_fee') }
              : {}),
            ...(pick('is_available') !== undefined
              ? { is_available: pick('is_available') }
              : {}),
          },
        });
        break;
      default:
        throw new BadRequestException(`Unsupported staff role: ${role}`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // PATCH /admin/staff/:id/status
  // ═══════════════════════════════════════════════════════════
  async updateStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED',
    actor?: AuditActor,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) {
      throw new NotFoundException('Staff member not found.');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });

    if (actor && updated.status !== existing.status) {
      await this.audit.record({
        actor,
        action:
          updated.status === 'SUSPENDED' ? 'SUSPEND_STAFF' : 'ACTIVATE_STAFF',
        entityType: 'staff',
        entityId: id,
        changes: { from: existing.status, to: updated.status },
      });
    }

    return {
      id: updated.id,
      status: updated.status,
      message:
        status === 'SUSPENDED'
          ? 'Staff member suspended. Login access revoked.'
          : 'Staff member activated.',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // POST /admin/staff/:id/reset-password
  // ═══════════════════════════════════════════════════════════
  async resetPassword(id: string, actor?: AuditActor) {
    const existing = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: { select: { name: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Staff member not found.');
    }

    const password = this.generateTempPassword();
    const bcrypt = await import('bcrypt');

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await bcrypt.hash(password, 10),
        passwordChangedAt: null,
      },
    });

    if (actor) {
      await this.audit.record({
        actor,
        action: 'RESET_PASSWORD',
        entityType: 'staff',
        entityId: id,
        changes: { note: 'Temporary password regenerated' },
      });
    }

    return {
      id: existing.id,
      message:
        'Temporary password generated. Staff must change it on next login.',
      temporary_password: password,
      require_password_change: true,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET /admin/providers
  // ═══════════════════════════════════════════════════════════
  private providerRoleFor(serviceType: string): string | null {
    return SERVICE_PROVIDER_ROLE[serviceType?.toUpperCase()] ?? null;
  }

  async listProviders(filter: { serviceType?: string; q?: string }) {
    const role = this.providerRoleFor(filter.serviceType ?? '');
    if (!role) {
      throw new BadRequestException(
        'Unsupported service type. Reassignment is available for MBBS, Specialist, Caregiver, Nutritionist and Nurse.',
      );
    }
    const nameWhere = filter.q
      ? {
          OR: [
            { firstNameEn: { contains: filter.q, mode: 'insensitive' } },
            { lastNameEn: { contains: filter.q, mode: 'insensitive' } },
            { email: { contains: filter.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const rows = await this.listProviderUsers(role, nameWhere);
    return { providers: rows };
  }

  private async listProviderUsers(
    role: string,
    nameWhere: Record<string, unknown> | undefined,
  ): Promise<any[]> {
    const userSelect = {
      select: {
        id: true,
        firstNameEn: true,
        lastNameEn: true,
        email: true,
        phoneNumber: true,
      },
    } as const;
    const activeWhere = {
      status: 'ACTIVE',
      ...(nameWhere ?? {}),
    } as const;

    switch (role) {
      case 'MBBS_DOCTOR': {
        const rows = await this.prisma.mbbs_doctor_profiles.findMany({
          where: { user: activeWhere },
          include: {
            user: userSelect,
          },
          orderBy: { user: { firstNameEn: 'asc' } },
        });
        return rows.map((p) => ({
          id: p.user.id,
          first_name_en: p.user.firstNameEn,
          last_name_en: p.user.lastNameEn,
          email: p.user.email,
          phone_number: p.user.phoneNumber,
          role: 'MBBS_DOCTOR',
          is_available: p.is_available,
          title: p.specialization ?? 'MBBS Doctor',
        }));
      }
      case 'SPECIALIST': {
        const rows = await this.prisma.specialist_profiles.findMany({
          where: { user: activeWhere },
          include: {
            user: userSelect,
          },
          orderBy: { user: { firstNameEn: 'asc' } },
        });
        return rows.map((p) => ({
          id: p.user.id,
          first_name_en: p.user.firstNameEn,
          last_name_en: p.user.lastNameEn,
          email: p.user.email,
          phone_number: p.user.phoneNumber,
          role: 'SPECIALIST',
          is_available: p.is_available,
          title: p.specialty_code ?? 'Specialist',
        }));
      }
      case 'CAREGIVER': {
        const rows = await this.prisma.caregiver_profiles.findMany({
          where: { user: activeWhere },
          include: {
            user: userSelect,
          },
          orderBy: { user: { firstNameEn: 'asc' } },
        });
        return rows.map((p) => ({
          id: p.user.id,
          first_name_en: p.user.firstNameEn,
          last_name_en: p.user.lastNameEn,
          email: p.user.email,
          phone_number: p.user.phoneNumber,
          role: 'CAREGIVER',
          is_available: p.is_available,
          title: p.specializations ?? 'Caregiver',
        }));
      }
      case 'NUTRITIONIST': {
        const rows = await this.prisma.nutritionist_profiles.findMany({
          where: { user: activeWhere },
          include: {
            user: userSelect,
          },
          orderBy: { user: { firstNameEn: 'asc' } },
        });
        return rows.map((p) => ({
          id: p.user.id,
          first_name_en: p.user.firstNameEn,
          last_name_en: p.user.lastNameEn,
          email: p.user.email,
          phone_number: p.user.phoneNumber,
          role: 'NUTRITIONIST',
          is_available: p.is_available,
          title: p.specializations ?? 'Nutritionist',
        }));
      }
      case 'NURSE': {
        const rows = await this.prisma.nurse_profiles.findMany({
          where: { user: activeWhere },
          include: {
            user: userSelect,
          },
          orderBy: { user: { firstNameEn: 'asc' } },
        });
        return rows.map((p) => ({
          id: p.user.id,
          first_name_en: p.user.firstNameEn,
          last_name_en: p.user.lastNameEn,
          email: p.user.email,
          phone_number: p.user.phoneNumber,
          role: 'NURSE',
          is_available: true,
          title: p.specialization ?? p.nurse_type ?? 'Nurse',
        }));
      }
      default:
        return [];
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GET /admin/tickets
  // ═══════════════════════════════════════════════════════════
  async listTickets(filters: {
    status?: string;
    serviceType?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const requestedPage = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));

    const where: any = {};
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }
    if (filters.serviceType) {
      where.service_type = filters.serviceType.toUpperCase();
    }
    if (filters.q) {
      const tokens = filters.q.trim().split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        where.AND = tokens.map((token) => ({
          OR: [
            { ticket_no: { contains: token, mode: 'insensitive' } },
            {
              session: {
                patient: {
                  OR: [
                    { first_name_en: { contains: token, mode: 'insensitive' } },
                    { last_name_en: { contains: token, mode: 'insensitive' } },
                    { mrn: { contains: token, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        }));
      }
    }

    const total = await this.prisma.service_tickets.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const skip = (page - 1) * pageSize;

    const tickets = await this.prisma.service_tickets.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        session: {
          select: {
            id: true,
            patient: {
              select: {
                id: true,
                mrn: true,
                first_name_en: true,
                last_name_en: true,
                phone_number: true,
              },
            },
          },
        },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });

    const providerIds = tickets
      .map((t) => t.assigned_provider_id)
      .filter((id): id is string => id !== null);
    const uniqueIds = [...new Set(providerIds)];
    const providerMap = new Map<
      string,
      { id: string; name: string; title: string }
    >();
    if (uniqueIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: uniqueIds } },
        include: {
          mbbs_doctor_profiles: { select: { specialization: true } },
          specialist_profiles: { select: { specialty_code: true } },
          caregiver_profiles: { select: { specializations: true } },
          nutritionist_profiles: {
            select: { specializations: true },
          },
          nurse_profiles: {
            select: { specialization: true, nurse_type: true },
          },
        },
      });
      for (const u of users) {
        const svc = (() =>
          (
            tickets.find((t) => t.assigned_provider_id === u.id)
              ?.service_type ?? ''
          ).toUpperCase())();
        let title: string | null = null;
        if (svc === 'MBBS' && u.mbbs_doctor_profiles)
          title = u.mbbs_doctor_profiles.specialization;
        else if (svc === 'SPECIALIST' && u.specialist_profiles)
          title = u.specialist_profiles.specialty_code;
        else if (svc === 'CAREGIVER' && u.caregiver_profiles)
          title = u.caregiver_profiles.specializations ?? 'Caregiver';
        else if (svc === 'NUTRITIONIST' && u.nutritionist_profiles)
          title = u.nutritionist_profiles.specializations ?? 'Nutritionist';
        else if (svc === 'NURSE' && u.nurse_profiles)
          title =
            u.nurse_profiles.specialization ?? u.nurse_profiles.nurse_type;
        providerMap.set(u.id, {
          id: u.id,
          name: `${u.firstNameEn} ${u.lastNameEn}`.trim(),
          title: title ?? '',
        });
      }
    }

    const formatDate = (d: Date | string | null | undefined) => {
      if (!d) return null;
      const date = typeof d === 'string' ? new Date(d) : d;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const rows = tickets.map((t) => {
      const provider = t.assigned_provider_id
        ? (providerMap.get(t.assigned_provider_id) ?? null)
        : null;
      return {
        id: t.id,
        ticket_no: t.ticket_no,
        session_id: t.session_id,
        service_type: t.service_type,
        status: t.status,
        scheduled_date: formatDate(t.scheduled_date),
        scheduled_time_slot: t.scheduled_time_slot,
        price: t.price,
        assigned_provider_id: t.assigned_provider_id,
        created_at: t.created_at,
        patient: t.session.patient,
        provider,
      };
    });

    return {
      tickets: rows,
      count: rows.length,
      total,
      page,
      pageSize,
      pageCount,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // POST /admin/tickets/:id/reassign
  // ═══════════════════════════════════════════════════════════
  async reassignTicket(
    id: string,
    assignedProviderId: string,
    actor?: AuditActor,
  ) {
    const ticket = await this.prisma.service_tickets.findUnique({
      where: { id },
      include: {
        session: { select: { id: true, patient_id: true } },
      },
    });
    if (!ticket) {
      throw new NotFoundException('Service ticket not found.');
    }

    const serviceType = ticket.service_type.toUpperCase();
    const role = this.providerRoleFor(serviceType);
    if (!role) {
      throw new BadRequestException(
        'Manual reassignment is not supported for this service type.',
      );
    }

    const provider = await this.prisma.user.findFirst({
      where: {
        id: assignedProviderId,
        role: { name: role },
      },
      select: {
        id: true,
        firstNameEn: true,
        lastNameEn: true,
        status: true,
        mbbs_doctor_profiles: { select: { user_id: true } },
        specialist_profiles: { select: { user_id: true } },
        caregiver_profiles: { select: { user_id: true } },
        nutritionist_profiles: { select: { user_id: true } },
        nurse_profiles: { select: { user_id: true } },
      },
    });
    if (!provider) {
      throw new BadRequestException(
        'Selected provider is not a valid provider of this service type.',
      );
    }

    const oldProviderId = ticket.assigned_provider_id;
    const patientId = ticket.session.patient_id;

    await this.prisma.$transaction(async (tx) => {
      if (serviceType === 'MBBS') {
        if (oldProviderId) {
          await tx.doctor_patient_assignments.deleteMany({
            where: { doctor_id: oldProviderId, patient_id: patientId },
          });
        }
        await tx.doctor_patient_assignments.upsert({
          where: {
            doctor_id_patient_id: {
              doctor_id: assignedProviderId,
              patient_id: patientId,
            },
          },
          create: {
            doctor_id: assignedProviderId,
            patient_id: patientId,
            appointment_activity: 'pending',
          },
          update: { appointment_activity: 'pending' },
        });
      } else if (serviceType === 'CAREGIVER') {
        if (oldProviderId) {
          await tx.caregiver_patient_assignments.deleteMany({
            where: {
              caregiver_id: oldProviderId,
              patient_id: patientId,
            },
          });
        }
        await tx.caregiver_patient_assignments.upsert({
          where: {
            caregiver_id_patient_id: {
              caregiver_id: assignedProviderId,
              patient_id: patientId,
            },
          },
          create: {
            caregiver_id: assignedProviderId,
            patient_id: patientId,
            status: 'ACTIVE',
          },
          update: { status: 'ACTIVE' },
        });
      } else if (serviceType === 'NURSE') {
        if (oldProviderId) {
          await tx.nurse_patient_assignments.deleteMany({
            where: { nurse_id: oldProviderId, patient_id: patientId },
          });
        }
        await tx.nurse_patient_assignments.upsert({
          where: {
            nurse_id_patient_id: {
              nurse_id: assignedProviderId,
              patient_id: patientId,
            },
          },
          create: {
            nurse_id: assignedProviderId,
            patient_id: patientId,
            status: 'ACTIVE',
          },
          update: { status: 'ACTIVE' },
        });
      }

      await tx.service_tickets.update({
        where: { id },
        data: { assigned_provider_id: assignedProviderId, status: 'ASSIGNED' },
      });
    });

    if (actor) {
      await this.audit.record({
        actor,
        action: 'REASSIGN_TICKET',
        entityType: 'ticket',
        entityId: id,
        changes: {
          ticket_no: ticket.ticket_no,
          service_type: serviceType,
          from_provider_id: oldProviderId ?? null,
          to_provider_id: assignedProviderId,
        },
      });
    }

    return {
      id,
      ticket_no: ticket.ticket_no,
      assigned_provider_id: assignedProviderId,
      status: 'ASSIGNED' as const,
      message: 'Provider reassigned successfully.',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET /admin/tickets/:id — single ticket detail (read-only)
  // ═══════════════════════════════════════════════════════════
  async getTicketDetail(id: string) {
    const ticket = await this.prisma.service_tickets.findUnique({
      where: { id },
      include: {
        session: {
          select: {
            id: true,
            total_amount: true,
            created_at: true,
            booked_by: true,
            patient: {
              select: {
                id: true,
                mrn: true,
                first_name_en: true,
                last_name_en: true,
                phone_number: true,
                sex: true,
                district: true,
              },
            },
            payments: {
              select: {
                id: true,
                status: true,
                amount: true,
                service_type: true,
                completed_at: true,
                created_at: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Service ticket not found.');
    }

    const serviceType = ticket.service_type.toUpperCase();
    const formatDate = (d: Date | string | null | undefined) => {
      if (!d) return null;
      const date = typeof d === 'string' ? new Date(d) : d;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let provider: {
      id: string;
      name: string;
      title: string | null;
      email: string | null;
      phone_number: string | null;
    } | null = null;
    if (ticket.assigned_provider_id) {
      const u = await this.prisma.user.findUnique({
        where: { id: ticket.assigned_provider_id },
        include: {
          mbbs_doctor_profiles: { select: { specialization: true } },
          specialist_profiles: { select: { specialty_code: true } },
          caregiver_profiles: { select: { specializations: true } },
          nutritionist_profiles: { select: { specializations: true } },
          nurse_profiles: {
            select: { specialization: true, nurse_type: true },
          },
        },
      });
      if (u) {
        let title: string | null = null;
        if (serviceType === 'MBBS' && u.mbbs_doctor_profiles)
          title = u.mbbs_doctor_profiles.specialization;
        else if (serviceType === 'SPECIALIST' && u.specialist_profiles)
          title = u.specialist_profiles.specialty_code;
        else if (serviceType === 'CAREGIVER' && u.caregiver_profiles)
          title = u.caregiver_profiles.specializations ?? 'Caregiver';
        else if (serviceType === 'NUTRITIONIST' && u.nutritionist_profiles)
          title = u.nutritionist_profiles.specializations ?? 'Nutritionist';
        else if (serviceType === 'NURSE' && u.nurse_profiles)
          title =
            u.nurse_profiles.specialization ?? u.nurse_profiles.nurse_type;
        provider = {
          id: u.id,
          name: `${u.firstNameEn} ${u.lastNameEn}`.trim(),
          title,
          email: u.email,
          phone_number: u.phoneNumber,
        };
      }
    }

    const payment = ticket.session.payments[0]
      ? {
          id: ticket.session.payments[0].id,
          status: ticket.session.payments[0].status,
          amount: Number(ticket.session.payments[0].amount),
          service_type: ticket.session.payments[0].service_type,
          completed_at: ticket.session.payments[0].completed_at,
          created_at: ticket.session.payments[0].created_at,
        }
      : null;

    const auditRows = await this.prisma.system_audit_logs.findMany({
      where: { entityType: 'ticket', entityId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        action: true,
        actorRole: true,
        actorUserId: true,
        changes: true,
        ipAddress: true,
        createdAt: true,
      },
    });

    let audit: {
      id: string;
      action: string;
      actor_name: string | null;
      actor_role: string | null;
      changes: Record<string, unknown> | null;
      ip_address: string | null;
      created_at: Date;
    }[] = [];
    if (auditRows.length > 0) {
      const actorIds = [...new Set(auditRows.map((r) => r.actorUserId))];
      const actors = await this.prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstNameEn: true, lastNameEn: true },
      });
      const actorName = new Map<string, string>();
      for (const a of actors)
        actorName.set(a.id, `${a.firstNameEn} ${a.lastNameEn}`.trim());
      audit = auditRows.map((r) => ({
        id: r.id,
        action: r.action,
        actor_name: actorName.get(r.actorUserId) ?? null,
        actor_role: r.actorRole,
        changes: (r.changes as Record<string, unknown> | null) ?? null,
        ip_address: r.ipAddress,
        created_at: r.createdAt,
      }));
    }

    return {
      ticket: {
        id: ticket.id,
        ticket_no: ticket.ticket_no,
        service_type: ticket.service_type,
        status: ticket.status,
        scheduled_date: formatDate(ticket.scheduled_date),
        scheduled_time_slot: ticket.scheduled_time_slot,
        price: ticket.price != null ? Number(ticket.price) : null,
        created_at: ticket.created_at,
      },
      patient: ticket.session.patient,
      provider,
      session: {
        id: ticket.session.id,
        total_amount:
          ticket.session.total_amount != null
            ? Number(ticket.session.total_amount)
            : null,
        created_at: ticket.session.created_at,
        booked_by: ticket.session.booked_by,
      },
      payment,
      audit,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET /admin/dashboard/stats — live dashboard aggregates
  // ═══════════════════════════════════════════════════════════
  async dashboardStats() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      bookingsToday,
      pendingTickets,
      assignedTickets,
      revenueTotal,
      revenueMonth,
      revenueByDay,
      revenueByService,
      serviceTickets,
      ticketCounts,
      activeStaff,
      recentTickets,
    ] = await this.prisma.$transaction([
      this.prisma.booking_sessions.count({
        where: { created_at: { gte: startOfToday } },
      }),
      this.prisma.service_tickets.count({ where: { status: 'PENDING' } }),
      this.prisma.service_tickets.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.payments.aggregate({
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
      this.prisma.payments.aggregate({
        _sum: { amount: true },
        where: { status: 'completed', completed_at: { gte: startOfMonth } },
      }),
      this.prisma.payments.findMany({
        where: { status: 'completed', completed_at: { gte: startOfToday } },
        select: { amount: true, completed_at: true },
      }),
      this.prisma.payments.groupBy({
        by: ['service_type'],
        _sum: { amount: true },
        where: { status: 'completed' },
      }),
      this.prisma.service_tickets.findMany({
        select: {
          service_type: true,
          price: true,
          status: true,
          created_at: true,
        },
      }),
      this.prisma.service_tickets.count(),
      this.prisma.user.count({
        where: {
          status: 'ACTIVE',
          role: { name: { in: SERVICE_PROVIDER_ROLES } },
        },
      }),
      this.prisma.service_tickets.findMany({
        orderBy: { created_at: 'desc' },
        take: 6,
        select: {
          id: true,
          ticket_no: true,
          service_type: true,
          status: true,
          price: true,
          scheduled_date: true,
          created_at: true,
          session: {
            select: {
              patient: {
                select: {
                  first_name_en: true,
                  last_name_en: true,
                  mrn: true,
                },
              },
            },
          },
        },
      }),
    ]);
    const revenueTotalSum = Number(revenueTotal._sum.amount ?? 0);
    const revenueMonthSum = Number(revenueMonth._sum.amount ?? 0);
    const onDuty = await this.listOnDutyStaff();

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - (6 - i),
      );
      const key = d.toISOString().slice(0, 10);
      const sum = revenueByDay
        .filter((p) => {
          const day = p.completed_at
            ? new Date(p.completed_at).toISOString().slice(0, 10)
            : null;
          return day === key;
        })
        .reduce((acc, p) => acc + Number(p.amount), 0);
      return {
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        value: sum,
      };
    });

    const revenueByServiceMap = new Map<string, number>();
    for (const row of revenueByService) {
      revenueByServiceMap.set(row.service_type, Number(row._sum.amount ?? 0));
    }

    const mixMap = new Map<string, { count: number; revenue: number }>();
    for (const t of serviceTickets) {
      const cur = mixMap.get(t.service_type) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      mixMap.set(t.service_type, cur);
    }
    for (const [st, rev] of revenueByServiceMap) {
      const cur = mixMap.get(st) ?? { count: 0, revenue: 0 };
      cur.revenue = rev;
      mixMap.set(st, cur);
    }

    const serviceMix = Array.from(mixMap.entries())
      .map(([service_type, v]) => ({
        service_type,
        count: v.count,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      kpis: {
        bookingsToday,
        pendingTickets,
        assignedTickets,
        totalTickets: ticketCounts,
        revenueTotal: revenueTotalSum,
        revenueMonth: revenueMonthSum,
        activeProviders: activeStaff,
      },
      revenueSeries: last7,
      serviceMix,
      recentTickets: recentTickets.map((t) => ({
        id: t.id,
        ticket_no: t.ticket_no,
        service_type: t.service_type,
        status: t.status,
        price: Number(t.price),
        scheduled_date: t.scheduled_date,
        patient: t.session?.patient
          ? {
              full_name:
                `${t.session.patient.first_name_en} ${t.session.patient.last_name_en}`.trim(),
              mrn: t.session.patient.mrn,
            }
          : null,
      })),
      onDuty,
    };
  }

  private async listOnDutyStaff() {
    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: { name: { in: SERVICE_PROVIDER_ROLES } },
      },
      take: 20,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        firstNameEn: true,
        lastNameEn: true,
        email: true,
        role: { select: { name: true } },
      },
    });
    const providerProfiles = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: { name: { in: SERVICE_PROVIDER_ROLES } },
      },
      take: 200,
      select: {
        id: true,
        mbbs_doctor_profiles: { select: { is_available: true } },
        specialist_profiles: { select: { is_available: true } },
        caregiver_profiles: { select: { is_available: true } },
        nutritionist_profiles: { select: { is_available: true } },
      },
    });
    const profileByUser = new Map<string, boolean>();
    for (const p of providerProfiles) {
      const prof = [
        p.mbbs_doctor_profiles,
        p.specialist_profiles,
        p.caregiver_profiles,
        p.nutritionist_profiles,
      ].find((x): x is { is_available: boolean } => x != null);
      if (prof) profileByUser.set(p.id, prof.is_available);
    }

    return users.map((u) => ({
      id: u.id,
      name: `${u.firstNameEn} ${u.lastNameEn}`.trim(),
      email: u.email,
      role: u.role?.name ?? 'STAFF',
      is_available: profileByUser.get(u.id) ?? true,
      busy: false,
    }));
  }

  // ═══════════════════════════════════════════════════════════
  // GET /admin/payments + GET /admin/payments/summary + PATCH /admin/payments/:id
  // ═══════════════════════════════════════════════════════════
  async listPayments(filters: {
    status?: string;
    serviceType?: string;
    from?: string;
    to?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const requestedPage = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));

    const where: Prisma.paymentsWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.serviceType) {
      where.service_type = filters.serviceType.toUpperCase();
    }
    if (filters.from || filters.to) {
      where.created_at = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(`${filters.to}T23:59:59.999Z`) } : {}),
      };
    }
    if (filters.q) {
      const token = filters.q.trim();
      if (token) {
        where.OR = [
          {
            patient: {
              first_name_en: { contains: token, mode: 'insensitive' },
            },
          },
          {
            patient: { last_name_en: { contains: token, mode: 'insensitive' } },
          },
          { patient: { mrn: { contains: token, mode: 'insensitive' } } },
          {
            booking_session: {
              tickets: {
                some: { ticket_no: { contains: token, mode: 'insensitive' } },
              },
            },
          },
        ];
      }
    }

    const total = await this.prisma.payments.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const skip = (page - 1) * pageSize;

    const payments = await this.prisma.payments.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            phone_number: true,
          },
        },
        booking_session: {
          select: {
            tickets: {
              select: { ticket_no: true },
              take: 1,
              orderBy: { created_at: 'desc' },
            },
          },
        },
      },
    });

    return {
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        service_type: p.service_type,
        created_at: p.created_at,
        completed_at: p.completed_at,
        patient: p.patient
          ? {
              id: p.patient.id,
              mrn: p.patient.mrn,
              first_name_en: p.patient.first_name_en,
              last_name_en: p.patient.last_name_en,
              phone_number: p.patient.phone_number,
            }
          : null,
        ticket_no: p.booking_session?.tickets[0]?.ticket_no ?? null,
      })),
      count: payments.length,
      total,
      page,
      pageSize,
      pageCount,
    };
  }

  async paymentSummary() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [completed, month, pending, failed, byService] =
      await this.prisma.$transaction([
        this.prisma.payments.aggregate({
          _sum: { amount: true },
          _count: true,
          where: { status: 'completed' },
        }),
        this.prisma.payments.aggregate({
          _sum: { amount: true },
          _count: true,
          where: { status: 'completed', completed_at: { gte: startOfMonth } },
        }),
        this.prisma.payments.aggregate({
          _sum: { amount: true },
          _count: true,
          where: { status: 'pending' },
        }),
        this.prisma.payments.aggregate({
          _count: true,
          where: { status: 'failed' },
        }),
        this.prisma.payments.groupBy({
          by: ['service_type'],
          _sum: { amount: true },
          _count: true,
          where: { status: 'completed' },
        }),
      ]);

    return {
      total_collected: Number(completed._sum.amount ?? 0),
      total_count: completed._count,
      month_collected: Number(month._sum.amount ?? 0),
      month_count: month._count,
      pending_total: Number(pending._sum.amount ?? 0),
      pending_count: pending._count,
      failed_count: failed._count,
      by_service: byService
        .map((s) => ({
          service_type: s.service_type,
          count: s._count,
          collected: Number(s._sum.amount ?? 0),
        }))
        .sort((a, b) => b.collected - a.collected),
    };
  }

  async updatePaymentStatus(
    id: string,
    status: 'completed' | 'failed' | 'refunded',
    actor?: AuditActor,
  ) {
    const payment = await this.prisma.payments.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found.');

    const previous = payment.status;
    const updated = await this.prisma.payments.update({
      where: { id },
      data: {
        status,
        ...(status === 'completed'
          ? { completed_at: payment.completed_at ?? new Date() }
          : {}),
      },
    });

    if (actor) {
      await this.audit.record({
        actor,
        action: 'UPDATE_PAYMENT',
        entityType: 'payment',
        entityId: id,
        changes: {
          amount: Number(updated.amount),
          service_type: updated.service_type,
          from_status: previous,
          to_status: status,
        },
      });
    }

    return {
      id,
      status: updated.status,
      amount: Number(updated.amount),
      message: 'Payment status updated.',
    };
  }

  // ═══════════════════════════════════════════════════════════
  // GET /admin/audit-logs + GET /admin/audit-logs/verify
  // ═══════════════════════════════════════════════════════════
  async listAuditLogs(filters: {
    action?: string;
    entityType?: string;
    actorUserId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const requestedPage = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 10));

    const where: any = {};
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.actorUserId) where.actorUserId = filters.actorUserId;

    const total = await this.prisma.system_audit_logs.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pageCount);
    const skip = (page - 1) * pageSize;

    const logs = await this.prisma.system_audit_logs.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    return {
      logs,
      count: logs.length,
      total,
      page,
      pageSize,
      pageCount,
    };
  }

  async verifyAuditLogs() {
    return this.audit.verify();
  }

  // ═══════════════════════════════════════════════════════════
  // Billing: GET /admin/payments/:paymentId/invoice (+ pdf) & service prices
  // ═══════════════════════════════════════════════════════════
  async getInvoiceForPayment(paymentId: string, actor: AuditActor) {
    const invoice = await this.billing.getInvoiceForPayment(paymentId);
    await this.audit.record({
      actor,
      action: 'INVOICE_GENERATED',
      entityType: 'invoice',
      entityId: invoice.id,
      changes: {
        invoice_no: invoice.invoice_no,
        payment_id: paymentId,
        amount: invoice.amount,
        service_type: invoice.service_type,
      },
    });
    return invoice;
  }

  async getInvoicePdf(paymentId: string) {
    const invoice = await this.billing.getInvoiceForPayment(paymentId);
    return this.billing.generateInvoicePdf(invoice.id);
  }

  async listServicePrices() {
    return this.billing.listServicePrices();
  }
}
