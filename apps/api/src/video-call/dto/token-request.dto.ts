import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class TokenRequestDto {
  @IsString()
  @IsNotEmpty()
  channelName!: string;

  @IsNumber()
  uid!: number;
}
