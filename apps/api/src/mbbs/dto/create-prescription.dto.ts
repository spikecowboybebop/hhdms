import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MedicationDto {
  @IsString()
  @IsNotEmpty()
  generic_name!: string;

  @IsOptional()
  @IsString()
  brand_name?: string;

  @IsString()
  @IsNotEmpty()
  dosage!: string;

  @IsString()
  @IsNotEmpty()
  frequency!: string;

  @IsInt()
  @Min(1)
  duration_days!: number;

  @IsString()
  @IsNotEmpty()
  route!: string;

  @IsOptional()
  @IsString()
  special_instructions?: string;
}

export class CreatePrescriptionDto {
  @IsOptional()
  @IsString()
  diagnosis_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MedicationDto)
  medications!: MedicationDto[];
}
