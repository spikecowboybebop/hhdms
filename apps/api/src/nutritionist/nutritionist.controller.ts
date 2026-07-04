// apps/api/src/nutritionist/nutritionist.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NutritionistService } from './nutritionist.service';
import {
  CreateAnthropometricRecordDto,
  CreateDietPlanDto,
  CreateFollowUpDto,
  CreateAdherenceLogDto,
  CalculateNutrientsDto,
} from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('nutritionist')
@UseGuards(JwtAuthGuard)
export class NutritionistController {
  constructor(private readonly nutritionistService: NutritionistService) {}

  // GET /nutritionist/dashboard
  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.nutritionistService.getDashboardMetrics(req.user.userId);
  }

  // GET /nutritionist/patients
  @Get('patients')
  getMyPatients(@Req() req: any) {
    return this.nutritionistService.getMyPatients(req.user.userId);
  }

  // GET /nutritionist/patient/:patientId/history
  @Get('patient/:patientId/history')
  getHistory(@Param('patientId') patientId: string) {
    return this.nutritionistService.getPatientMedicalHistory(patientId);
  }

  // ─── Anthropometrics ───────────────────────────────────────────────────

  // POST /nutritionist/metrics
  @Post('metrics')
  recordMetrics(@Req() req: any, @Body() dto: CreateAnthropometricRecordDto) {
    return this.nutritionistService.recordAnthropometrics(req.user.userId, dto);
  }

  // GET /nutritionist/metrics/:patientId
  @Get('metrics/:patientId')
  getMetricsHistory(@Param('patientId') patientId: string) {
    return this.nutritionistService.getAnthropometricHistory(patientId);
  }

  // ─── Diet Plans ────────────────────────────────────────────────────────

  // POST /nutritionist/diet-plan
  @Post('diet-plan')
  createDietPlan(@Req() req: any, @Body() dto: CreateDietPlanDto) {
    return this.nutritionistService.createDietPlan(req.user.userId, dto);
  }

  // GET /nutritionist/diet-plans?patientId=xxx
  @Get('diet-plans')
  getDietPlans(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.nutritionistService.getDietPlans(req.user.userId, patientId);
  }

  // GET /nutritionist/diet-plan/:planId
  @Get('diet-plan/:planId')
  getDietPlan(@Param('planId') planId: string) {
    return this.nutritionistService.getDietPlanById(planId);
  }

  // ─── Follow-ups ────────────────────────────────────────────────────────

  // POST /nutritionist/follow-up
  @Post('follow-up')
  scheduleFollowUp(@Req() req: any, @Body() dto: CreateFollowUpDto) {
    return this.nutritionistService.scheduleFollowUp(req.user.userId, dto);
  }

  // GET /nutritionist/follow-ups
  @Get('follow-ups')
  getFollowUps(@Req() req: any) {
    return this.nutritionistService.getFollowUps(req.user.userId);
  }

  // ─── Adherence ─────────────────────────────────────────────────────────

  // POST /nutritionist/adherence
  @Post('adherence')
  logAdherence(@Req() req: any, @Body() dto: CreateAdherenceLogDto) {
    return this.nutritionistService.submitAdherence(req.user.userId, dto);
  }

  // GET /nutritionist/adherence?patientId=xxx
  @Get('adherence')
  getAdherenceLogs(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.nutritionistService.getAdherenceLogs(
      req.user.userId,
      patientId,
    );
  }

  // ─── Nutrient Calculator ───────────────────────────────────────────────

  // POST /nutritionist/calculate-nutrients
  @Post('calculate-nutrients')
  calculateNutrients(@Body() dto: CalculateNutrientsDto) {
    return this.nutritionistService.calculateNutrients(dto);
  }
}
