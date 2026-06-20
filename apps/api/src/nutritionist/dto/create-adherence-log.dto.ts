import { IsInt, IsOptional, IsString, IsUUID, Max, Min, IsNumber } from 'class-validator';

export class CreateAdherenceLogDto {
  @IsUUID()
  patient_id!: string;

  @IsOptional()
  @IsUUID()
  follow_up_id?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  adherence_score!: number;

  @IsOptional()
  @IsString()
  challenges?: string;

  @IsOptional()
  @IsString()
  modifications?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  weight_kg?: number;
}