import { IsIn, IsNotEmpty } from 'class-validator';

export type PaymentStatus = 'completed' | 'failed' | 'refunded';

export class UpdatePaymentDto {
  @IsNotEmpty()
  @IsIn(['completed', 'failed', 'refunded'])
  status!: PaymentStatus;
}
