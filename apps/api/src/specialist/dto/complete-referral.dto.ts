import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CompleteReferralDto {
  @IsUUID()
  @IsNotEmpty()
  referralId!: string;

  @IsString()
  @IsNotEmpty()
  responseNotes!: string;

  @IsUUID()
  @IsNotEmpty()
  specialistId!: string;
}