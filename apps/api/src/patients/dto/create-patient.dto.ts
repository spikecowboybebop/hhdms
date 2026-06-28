import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  full_name_en!: string;

  @IsString()
  @IsNotEmpty()
  full_name_bn!: string;

  @IsDateString()
  @IsNotEmpty()
  date_of_birth!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['Male', 'Female', 'Child'])
  sex!: string;

  @IsString()
  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  blood_group?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Please provide a valid 11-digit phone number.',
  })
  primary_phone!: string;

  @IsString()
  @IsOptional()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Please provide a valid 11-digit alternative phone number.',
  })
  alternative_phone?: string;

  @IsString()
  @IsNotEmpty()
  emergency_contact_name!: string;

  @IsString()
  @IsNotEmpty()
  emergency_contact_relation!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Please provide a valid 11-digit emergency contact number.',
  })
  emergency_contact_phone!: string;

  @IsString()
  @IsNotEmpty()
  division!: string;

  @IsString()
  @IsNotEmpty()
  district!: string;

  @IsString()
  @IsNotEmpty()
  thana!: string;

  @IsString()
  @IsNotEmpty()
  address_detail!: string;

  @IsString()
  @IsOptional()
  agent_notes?: string;

  @IsOptional()
  @IsBoolean()
  has_emergency_flag?: boolean;

  @IsString()
  @IsOptional()
  booked_by?: string;
}
