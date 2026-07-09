import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUsgReportDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsString()
  @IsNotEmpty()
  body_part!: string;

  @IsString()
  @IsNotEmpty()
  findings!: string;

  @IsOptional()
  @IsString()
  impression?: string;

  @IsOptional()
  @IsString()
  annotated_images?: string;

  @IsOptional()
  @IsString()
  storage_url?: string;

  @IsOptional()
  @IsString()
  dicom_series_uids?: string;
}
