import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CaregiverService } from './caregiver.service';
import {
  CreateActivityLogDto,
  CreateConditionReportDto,
  CreateCheckInDto,
  CreateCheckOutDto,
} from './dto';

@Controller('caregiver')
@UseGuards(AuthGuard('jwt'))
export class CaregiverController {
  constructor(private readonly caregiverService: CaregiverService) {}

  private getUserId(req: any): string {
    return req.user?.sub;
  }

  // ===================== Profile =====================

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.caregiverService.getProfile(this.getUserId(req));
  }

  // ===================== Patients =====================

  @Get('patients')
  async getMyPatients(@Req() req: any) {
    return this.caregiverService.getMyPatients(this.getUserId(req));
  }

  // ===================== Activity Logs (CG-005) =====================

  @Post('activities')
  @HttpCode(HttpStatus.CREATED)
  async createActivityLog(@Body() dto: CreateActivityLogDto, @Req() req: any) {
    return this.caregiverService.createActivityLog(this.getUserId(req), dto);
  }

  @Get('activities')
  async getActivityLogs(
    @Req() req: any,
    @Query('patient_id') patientId?: string,
  ) {
    return this.caregiverService.getActivityLogs(
      this.getUserId(req),
      patientId,
    );
  }

  // ===================== Condition Reports (CG-007) =====================

  @Post('condition-reports')
  @HttpCode(HttpStatus.CREATED)
  async createConditionReport(
    @Body() dto: CreateConditionReportDto,
    @Req() req: any,
  ) {
    return this.caregiverService.createConditionReport(
      this.getUserId(req),
      dto,
    );
  }

  @Get('condition-reports')
  async getConditionReports(
    @Req() req: any,
    @Query('patient_id') patientId?: string,
  ) {
    return this.caregiverService.getConditionReports(
      this.getUserId(req),
      patientId,
    );
  }

  // ===================== Send Alert (CG-007) =====================

  @Post('condition-reports/:id/alert/:target')
  @HttpCode(HttpStatus.OK)
  async sendAlert(
    @Param('id') reportId: string,
    @Param('target') target: 'nurse' | 'doctor',
    @Req() req: any,
  ) {
    return this.caregiverService.sendAlert(
      this.getUserId(req),
      reportId,
      target,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CG-006: GPS Check-In/Out Endpoints
  // ══════════════════════════════════════════════════════════════════════════

  @Post('check-in')
  @HttpCode(HttpStatus.CREATED)
  async checkIn(@Body() dto: CreateCheckInDto, @Req() req: any) {
    return this.caregiverService.checkIn(this.getUserId(req), dto);
  }

  @Post('check-out/:id')
  @HttpCode(HttpStatus.OK)
  async checkOut(
    @Param('id') recordId: string,
    @Body() dto: CreateCheckOutDto,
    @Req() req: any,
  ) {
    return this.caregiverService.checkOut(this.getUserId(req), recordId, dto);
  }

  @Get('check-in-out')
  async getCheckInOuts(
    @Req() req: any,
    @Query('patient_id') patientId?: string,
  ) {
    return this.caregiverService.getCheckInOuts(
      this.getUserId(req),
      patientId,
    );
  }

  @Get('check-in-out/today')
  async getTodayCheckInOut(@Req() req: any) {
    return this.caregiverService.getTodayCheckInOut(this.getUserId(req));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CG-008: Timesheet Endpoints
  // ══════════════════════════════════════════════════════════════════════════

  @Get('timesheets')
  async getTimesheets(
    @Req() req: any,
    @Query('month') month?: string,
  ) {
    return this.caregiverService.getTimesheets(this.getUserId(req), month);
  }
}
