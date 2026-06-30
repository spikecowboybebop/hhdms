import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateConditionReportDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['FALL', 'MEDICATION_REFUSAL', 'BEHAVIORAL_CHANGE', 'PHYSICAL_SYMPTOM'])
  report_type: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  @IsIn(['MILD', 'MODERATE', 'SEVERE'])
  severity?: string;
}
