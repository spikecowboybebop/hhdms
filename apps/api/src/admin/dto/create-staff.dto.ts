import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export const STAFF_ROLES = [
  'MBBS_DOCTOR',
  'SPECIALIST',
  'NURSE',
  'CAREGIVER',
  'NUTRITIONIST',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export const SPECIALTY_CODES = [
  'SP-LUNG',
  'SP-HEART',
  'SP-BRAIN',
  'SP-KIDNEY',
  'SP-SKIN',
  'SP-ENT',
  'SP-SURG',
  'SP-GYNAE',
  'SP-MED',
  'SP-PAIN',
  'SP-ONCO',
] as const;

export const NURSE_TYPES = ['ADULT', 'PEDIATRIC'] as const;

export const SHIFT_PREFERENCES = ['DAY', 'NIGHT', 'ROTATING'] as const;

export class CreateStaffDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 20)
  phone_number!: string;

  @IsString()
  @IsNotEmpty()
  first_name_en!: string;

  @IsString()
  @IsNotEmpty()
  last_name_en!: string;

  @IsString()
  @IsOptional()
  first_name_bn?: string;

  @IsString()
  @IsOptional()
  last_name_bn?: string;

  @IsString()
  @IsOptional()
  @Length(10, 20)
  nid?: string;

  @IsString()
  @IsOptional()
  photo_url?: string;

  @IsIn(STAFF_ROLES)
  role!: StaffRole;

  // ── MBBS Doctor (SP-MBBS-001) ────────────────────────────────
  @IsOptional()
  @IsString()
  license_number?: string;

  @IsOptional()
  @IsString()
  bmdc_registration?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  qualification?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  years_of_experience?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  consultation_fee?: number;

  @IsOptional()
  @IsString()
  signature_url?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  thana?: string;

  @IsOptional()
  @IsString()
  service_area?: string;

  // ── Specialist (SP-2: 11 categories) ────────────────────────
  @IsOptional()
  @IsIn(SPECIALTY_CODES)
  specialty_code?: string;

  @IsOptional()
  @IsString()
  sub_specialties?: string;

  // ── Nurse (SP-3) ─────────────────────────────────────────────
  @IsOptional()
  @IsIn(NURSE_TYPES)
  nurse_type?: string;

  @IsOptional()
  @IsString()
  bnmc_registration?: string;

  @IsOptional()
  @IsString()
  skills?: string;

  @IsOptional()
  @IsIn(SHIFT_PREFERENCES)
  shift_preference?: string;

  @IsOptional()
  @IsString()
  gps_device_id?: string;

  // ── Caregiver (SP-4) ─────────────────────────────────────────
  @IsOptional()
  @IsString()
  @IsIn(['M', 'F'])
  gender?: string;

  @IsOptional()
  @IsString()
  specializations?: string;

  @IsOptional()
  @IsString()
  training_certs?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // ── Nutritionist (SP-6) ──────────────────────────────────────
  @IsOptional()
  @IsString()
  qualifications?: string;
}
