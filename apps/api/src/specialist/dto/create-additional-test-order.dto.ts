import { IsString, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateAdditionalTestOrderDto {
  @IsString()
  referralId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  test_ids!: string[];

  @IsOptional()
  @IsString()
  clinical_notes?: string;
}
