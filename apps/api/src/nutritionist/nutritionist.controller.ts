import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NutritionistService } from './nutritionist.service';
import {
  BookConsultationDto,
  CreateAnthropometricRecordDto,
  CreateDietPlanDto,
  CreateFollowUpDto,
  CreateAdherenceLogDto,
  CalculateNutrientsDto,
} from './dto'; // Assumes an index.ts file exists inside the dto/ folder
@Controller('nutritionist')
export class NutritionistController {
  constructor(private readonly nutritionistService: NutritionistService) {}

  @Get('patient/:patientId/history')
  getHistory(@Param('patientId') patientId: string) {
    return this.nutritionistService.getPatientMedicalHistory(patientId);
  }

  @Post('appointment/:appointmentId/nutritionist/:nutritionistId/metrics')
  async recordMetrics(
    @Param('appointmentId') appointmentId: string,
    @Param('nutritionistId') nutritionistId: string,
    @Body() dto: CreateAnthropometricRecordDto, // Update type here
  ) {
    // ... handling logic
  }

  @Post('appointment/:appointmentId/nutritionist/:nutritionistId/chart')
  async createChart(
    @Param('appointmentId') appointmentId: string,
    @Param('nutritionistId') nutritionistId: string,
    @Body() dto: CreateDietPlanDto, // Update type here
  ) {
    // ... handling logic
  }

  @Post('nutritionist/:nutritionistId/adherence')
  logAdherence(
    @Param('nutritionistId') nutritionistId: string,
    @Body() dto: CreateAdherenceLogDto,
  ) {
    return this.nutritionistService.submitAdherence(nutritionistId, dto);
  }
}
