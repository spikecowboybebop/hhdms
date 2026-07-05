import { IsString, IsOptional } from 'class-validator';

export class CreateEmergencyFlagDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
