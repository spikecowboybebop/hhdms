import { IsString, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';

export class CreateTestOrderDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  test_ids!: string[];

  @IsOptional()
  @IsString()
  clinical_notes?: string;
}
