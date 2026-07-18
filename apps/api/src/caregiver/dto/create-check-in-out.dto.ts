import { IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class CreateCheckInDto {
  @IsUUID()
  @IsNotEmpty()
  patient_id!: string;

  @IsNumber()
  @IsNotEmpty()
  latitude!: number;

  @IsNumber()
  @IsNotEmpty()
  longitude!: number;
}

export class CreateCheckOutDto {
  @IsNumber()
  @IsNotEmpty()
  latitude!: number;

  @IsNumber()
  @IsNotEmpty()
  longitude!: number;
}
