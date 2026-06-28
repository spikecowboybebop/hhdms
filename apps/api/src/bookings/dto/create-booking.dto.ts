import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ServiceTicketDto {
  @IsString()
  @IsNotEmpty()
  service_type!: string;

  @IsString()
  @IsOptional()
  scheduled_date?: string;

  @IsString()
  @IsOptional()
  scheduled_time_slot?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  @IsOptional()
  assigned_provider_id?: string;

  @IsObject()
  @IsOptional()
  additional_meta?: Record<string, unknown>;
}

export class CreateBookingSessionDto {
  @IsString()
  @IsNotEmpty()
  patient_id!: string;

  @IsString()
  @IsOptional()
  booked_by?: string;

  @IsString()
  @IsOptional()
  agent_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceTicketDto)
  services!: ServiceTicketDto[];
}
