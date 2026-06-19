import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEducationMaterialDto {
  @IsUUID()
  uploaded_by!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  title_bn?: string;

  @IsString()
  material_type!: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsString()
  file_url!: string;

  @IsOptional()
  @IsString()
  mime_type?: string;

  @IsOptional()
  @IsBoolean()
  shared_via_portal?: boolean;

  @IsOptional()
  @IsBoolean()
  shared_via_whatsapp?: boolean;
}