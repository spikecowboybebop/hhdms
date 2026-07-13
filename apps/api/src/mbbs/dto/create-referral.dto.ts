import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateReferralDto {
  @IsString()
  @IsNotEmpty()
  specialty_code!: string;

  @IsString()
  @IsNotEmpty()
  referral_reason!: string;

  @IsOptional()
  @IsString()
  clinical_summary?: string;

  @IsOptional()
  @IsBoolean()
  is_emergency?: boolean;

  @IsOptional()
  @IsUUID()
  specialist_id?: string;
}
