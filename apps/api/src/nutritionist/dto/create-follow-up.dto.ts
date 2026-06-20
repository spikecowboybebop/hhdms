import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum FollowUpInterval {
  TWO_WEEKS = 'TWO_WEEKS',
  ONE_MONTH = 'ONE_MONTH',
  THREE_MONTHS = 'THREE_MONTHS',
}

export class CreateFollowUpDto {
  @IsUUID()
  patient_id!: string;

  @IsOptional()
  @IsUUID()
  plan_id?: string;

  @IsEnum(FollowUpInterval)
  interval!: FollowUpInterval;

  @IsOptional()
  @IsDateString()
  follow_up_at?: string;

  @IsOptional()
  @IsString()
  reminder_channel?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}