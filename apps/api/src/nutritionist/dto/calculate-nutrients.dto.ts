import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CalculateNutrientsFoodDto {
  @IsUUID()
  food_item_id!: string;

  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  grams!: number;
}

export class CalculateNutrientsDto {
  @IsArray()
  @ArrayNotEmpty()
  foods!: CalculateNutrientsFoodDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
