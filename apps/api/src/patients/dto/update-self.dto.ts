import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  Matches,
} from 'class-validator';

export class UpdateSelfDto {
  @IsString()
  @IsOptional()
  full_name_en?: string;

  @IsString()
  @IsOptional()
  full_name_bn?: string;

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsString()
  @IsOptional()
  @IsIn(['Male', 'Female', 'Child'])
  sex?: string;

  @IsString()
  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  blood_group?: string;

  @IsString()
  @IsOptional()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Please provide a valid 11-digit phone number.',
  })
  primary_phone?: string;

  @IsString()
  @IsOptional()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Please provide a valid 11-digit alternative phone number.',
  })
  alternative_phone?: string;

  @IsString()
  @IsOptional()
  emergency_contact_name?: string;

  @IsString()
  @IsOptional()
  emergency_contact_relation?: string;

  @IsString()
  @IsOptional()
  emergency_contact_phone?: string;

  @IsString()
  @IsOptional()
  division?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  thana?: string;

  @IsString()
  @IsOptional()
  address_detail?: string;
}
