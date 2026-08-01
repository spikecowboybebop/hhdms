import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── NS-004: Vital Signs ──

export class CreateVitalsDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(300)
  systolic_bp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(200)
  diastolic_bp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(250)
  pulse_bpm?: number;

  @IsOptional()
  @Type(() => Number)
  temperature_c?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  spo2_pct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(60)
  respiratory_rate?: number;

  @IsOptional()
  @Type(() => Number)
  blood_glucose?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── NS-005: Medication Administration ──

export class CreateMedicationAdminDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsString()
  @IsNotEmpty()
  drug_name!: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ── NS-006: IV Fluid ──

export class CreateIvFluidDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsString()
  @IsNotEmpty()
  fluid_type!: string;

  @Type(() => Number)
  @IsNumber()
  rate_ml_hr!: number;

  @IsOptional()
  @IsString()
  site_condition?: string;
}

export class UpdateIvFluidDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rate_ml_hr?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  volume_given_ml?: number;

  @IsOptional()
  @IsString()
  site_condition?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'PAUSED', 'COMPLETED', 'DISCONTINUED'])
  status?: string;
}

// ── NS-007: Wound Care ──

export class CreateWoundCareDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsOptional()
  @IsString()
  wound_location?: string;

  @IsOptional()
  @IsString()
  wound_measurements?: string;

  @IsOptional()
  @IsString()
  wound_condition?: string;

  @IsOptional()
  @IsString()
  dressing_applied?: string;

  @IsOptional()
  @IsString()
  healing_progress?: string;

  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  longitude?: number;
}

// ── NS-010: Shift Handover ──

export class CreateHandoverDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsString()
  @IsNotEmpty()
  current_status!: string;

  @IsOptional()
  @IsString()
  active_concerns?: string;

  @IsOptional()
  @IsString()
  medications_due?: string;

  @IsOptional()
  @IsString()
  physician_orders?: string;

  @IsOptional()
  @IsString()
  patient_instructions?: string;

  @IsOptional()
  @IsString()
  handed_over_to_email?: string;
}

// ── NS-012: Doctor Consultation Request ──

export class CreateConsultationRequestDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsString()
  @IsNotEmpty()
  concern_summary!: string;

  @IsOptional()
  @IsString()
  @IsIn(['NORMAL', 'URGENT', 'EMERGENCY'])
  urgency_level?: string;
}

// ── NS-013: Supply Usage ──

export class CreateSupplyUsageDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsString()
  @IsNotEmpty()
  supply_name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity_used?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}

// ── NS-014: Pediatric Care ──

export class CreateFeedingLogDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsString()
  @IsNotEmpty()
  feeding_type!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  volume_ml?: number;

  @IsOptional()
  @IsString()
  frequency?: string;
}

export class CreateGrowthRecordDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsOptional()
  @Type(() => Number)
  weight_kg?: number;

  @IsOptional()
  @Type(() => Number)
  height_cm?: number;

  @IsOptional()
  @Type(() => Number)
  head_circumference_cm?: number;
}

export class CreateVaccinationRecordDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsString()
  @IsNotEmpty()
  vaccine_name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  dose_number?: number;

  @IsOptional()
  @IsString()
  next_due_date?: string;
}
