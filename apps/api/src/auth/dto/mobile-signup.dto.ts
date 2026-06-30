// apps/api/src/auth/dto/mobile-signup.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class MobileSignupDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required.' })
  first_name_en!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required.' })
  last_name_en!: string;

  @IsString()
  @IsNotEmpty()
  // Validates standard 11-digit mobile structures (e.g., matching common South Asian formats starting with 01)
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Please provide a valid 11-digit mobile phone number.',
  })
  phone_number!: string;

  @IsEmail(
    {},
    { message: 'Please provide a valid patient email configuration.' },
  )
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, {
    message: 'Security passwords must contain at least 6 characters.',
  })
  password!: string;

  @IsString()
  @IsOptional()
  role_name?: string;
}
