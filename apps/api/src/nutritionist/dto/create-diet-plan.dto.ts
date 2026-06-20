import { IsArray, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export interface DietPlanFoodInput {
  name: string;
  quantity: string;
  grams?: number;
}

export interface DietPlanMealInput {
  meal_slot: string;
  calories?: number;
  preparation_guidance?: string;
  foods: DietPlanFoodInput[];
}

export class CreateDietPlanDto {
  @IsUUID()
  patient_id!: string;

  @IsOptional()
  @IsUUID()
  consultation_id?: string;

  @IsOptional()
  @IsUUID()
  template_id?: string;

  @IsOptional()
  @IsString()
  template_key?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  condition_name?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsNumber()
  total_calories?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  meals?: DietPlanMealInput[];
}