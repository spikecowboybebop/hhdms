import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateAnthropometricRecordDto {
  @IsUUID()
  patient_id!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(40)
  @Max(250)
  height_cm?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(400)
  weight_kg?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(200)
  waist_cm?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(20)
  @Max(200)
  hip_cm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}