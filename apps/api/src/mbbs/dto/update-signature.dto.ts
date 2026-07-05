import { IsString, IsUrl, IsNotEmpty } from 'class-validator';

export class UpdateSignatureDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  signature_url!: string;
}
