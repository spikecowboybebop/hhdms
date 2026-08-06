import { IsNotEmpty, IsUUID } from 'class-validator';

export class ReassignTicketDto {
  @IsUUID()
  @IsNotEmpty()
  assigned_provider_id!: string;
}
