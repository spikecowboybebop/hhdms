import { IsString, IsOptional } from 'class-validator';

export class AvailableProvidersQueryDto {
  @IsString()
  serviceType!: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  thana?: string;

  @IsString()
  @IsOptional()
  date?: string;
}
