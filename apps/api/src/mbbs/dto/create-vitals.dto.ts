import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsDecimal,
  Min,
  Max,
  IsUUID,
} from 'class-validator';

export class CreateVitalsDto {
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(250)
  systolic_bp?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(160)
  diastolic_bp?: number;

  @IsOptional()
  @IsInt()
  @Min(20)
  @Max(300)
  pulse_bpm?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '1' })
  temperature_c?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(100)
  spo2_pct?: number;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(60)
  respiratory_rate?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '1' })
  weight_kg?: number;

  @IsOptional()
  @IsDecimal({ decimal_digits: '1' })
  height_cm?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsUUID()
  @IsNotEmpty()
  appointment_id?: string;
}
