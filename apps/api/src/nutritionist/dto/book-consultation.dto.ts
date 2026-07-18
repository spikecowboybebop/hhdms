import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

// Ensure the local file structure has a matching enum block for the controller's direct import
export enum ConsultationType {
  HOME_VISIT = 'HOME_VISIT',
}

export class BookConsultationDto {
  // ... rest of your original code remains exactly untouched
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsEnum(ConsultationType)
  consultation_type!: ConsultationType;

  @IsOptional()
  @IsUUID()
  nutritionist_id?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsDateString()
  preferred_at?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
