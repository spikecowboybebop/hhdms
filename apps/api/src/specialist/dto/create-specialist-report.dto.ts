import { IsNotEmpty, IsObject, IsUUID } from 'class-validator';

export class CreateSpecialistReportDto {
  @IsUUID()
  @IsNotEmpty()
  referralId!: string;

  @IsUUID()
  @IsNotEmpty()
  templateId!: string;

  @IsObject()
  @IsNotEmpty()
  formData!: Record<string, unknown>;
}
