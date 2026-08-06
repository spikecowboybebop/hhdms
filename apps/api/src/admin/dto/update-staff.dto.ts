import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import {
  NURSE_TYPES,
  SHIFT_PREFERENCES,
  SPECIALTY_CODES,
  STAFF_ROLES,
} from './create-staff.dto';

export class UpdateStaffDto {
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Length(8, 20)
  phone_number?: string;

  @IsString()
  @IsOptional()
  first_name_en?: string;

  @IsString()
  @IsOptional()
  last_name_en?: string;

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
  @IsOptional()
  role?: (typeof STAFF_ROLES)[number];

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

  @IsOptional()
  @IsIn(SPECIALTY_CODES)
  specialty_code?: string;

  @IsOptional()
  @IsString()
  sub_specialties?: string;

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

  @IsOptional()
  @IsString()
  qualifications?: string;

  @IsOptional()
  @IsBoolean()
  is_available?: boolean;
}
