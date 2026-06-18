import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateDiagnosisDto {
  @IsString()
  @IsNotEmpty()
  icd10_code!: string;

  @IsOptional()
  @IsString()
  chief_complaint?: string;

  @IsOptional()
  @IsString()
  history_of_present_illness?: string;

  @IsOptional()
  @IsString()
  review_of_systems?: string;

  @IsOptional()
  @IsString()
  examination_findings?: string;

  @IsString()
  @IsNotEmpty()
  preliminary_diagnosis!: string;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;
}
