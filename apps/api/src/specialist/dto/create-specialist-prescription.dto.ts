import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TaperStepDto {
  @IsString()
  @IsNotEmpty()
  days_range!: string;

  @IsString()
  @IsNotEmpty()
  dosage!: string;
}

export class MedicationDto {
  @IsString()
  @IsNotEmpty()
  drug_name!: string;

  @IsString()
  @IsNotEmpty()
  dosage!: string;

  @IsString()
  @IsNotEmpty()
  frequency!: string;

  @IsString()
  @IsNotEmpty()
  duration!: string;

  @IsString()
  @IsNotEmpty()
  route!: string;

  @IsOptional()
  @IsString()
  special_instructions?: string;

  @IsBoolean()
  conditional_flag!: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TaperStepDto)
  taper_details?: TaperStepDto[];
}

export class CreateSpecialistPrescriptionDto {
  @IsString()
  @IsNotEmpty()
  referralId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications!: MedicationDto[];
}
