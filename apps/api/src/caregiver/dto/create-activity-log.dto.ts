import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateActivityLogDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['HYGIENE', 'MOBILITY', 'FEEDING', 'MEDICATION', 'COMPANIONSHIP', 'EXERCISE'])
  activity_type: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
