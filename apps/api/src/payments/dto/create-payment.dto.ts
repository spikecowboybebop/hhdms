import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  booking_session_id!: string;
}

export class ConfirmPaymentDto {
  @IsString()
  @IsNotEmpty()
  payment_id!: string;

  @IsOptional()
  @IsString()
  stripe_payment_intent_id?: string;
}
