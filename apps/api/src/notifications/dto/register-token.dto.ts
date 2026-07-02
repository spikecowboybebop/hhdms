import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RegisterTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsOptional()
  device_type?: string;
}
