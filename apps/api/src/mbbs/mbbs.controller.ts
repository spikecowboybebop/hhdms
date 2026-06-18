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
} from '@nestjs/common';
import { MbbsService } from './mbbs.service';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { CreateTestOrderDto } from './dto/create-test-order.dto';
import { CreateReferralDto } from './dto/create-referral.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateEmergencyFlagDto } from './dto/create-emergency-flag.dto';

// TODO: Import JWT Auth Guard when it's built
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';

@Controller('mbbs')
// @UseGuards(JwtAuthGuard, RolesGuard)  // TODO: Enable when auth guards are built
// @Roles('MBBS_DOCTOR')                  // TODO: Enable role-based access
export class MbbsController {
  constructor(private readonly mbbsService: MbbsService) {}

  // Helper for auth mock
  private async getDoctorUserId(req: any): Promise<string> {
    const userId = req.user?.sub;
    if (userId) return userId;
    
    // For local dev, return the first MBBS doctor's ID if auth is not yet wired up
    const firstDoctor = await this.mbbsService['prisma'].mbbs_doctor_profiles.findFirst();
    return firstDoctor?.user_id || 'system';
  }

  // ============================================================
  // Patient Endpoints (MB-002)
  // ============================================================

  @Get('patients')
  async getMyPatients(@Req() req: any) {
    const doctorUserId = await this.getDoctorUserId(req);
    return this.mbbsService.getMyPatients(doctorUserId);
  }

  @Get('patients/:id')
  async getPatientProfile(@Param('id') id: string) {
    return this.mbbsService.getPatientProfile(id);
  }

  // ============================================================
  // Vital Signs Endpoints (MB-003)
  // ============================================================

  @Post('patients/:id/vitals')
  @HttpCode(HttpStatus.CREATED)
  async recordVitalSigns(
    @Param('id') patientId: string,
    @Body() dto: CreateVitalsDto,
    @Req() req: any,
  ) {
    const doctorUserId = await this.getDoctorUserId(req);
    return this.mbbsService.recordVitalSigns(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/vitals')
  async getVitalSignsHistory(@Param('id') patientId: string) {
    return this.mbbsService.getVitalSignsHistory(patientId);
  }

  // ============================================================
  // Diagnosis & ICD-10 Endpoints (MB-004)
  // ============================================================

  @Get('icd10/search')
  async searchIcd10Codes(@Query('q') query: string) {
    return this.mbbsService.searchIcd10Codes(query);
  }

  @Post('patients/:id/diagnoses')
  @HttpCode(HttpStatus.CREATED)
  async createDiagnosis(
    @Param('id') patientId: string,
    @Body() dto: CreateDiagnosisDto,
    @Req() req: any,
  ) {
    const doctorUserId = await this.getDoctorUserId(req);
    return this.mbbsService.createDiagnosis(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/diagnoses')
  async getDiagnosisHistory(@Param('id') patientId: string) {
    return this.mbbsService.getDiagnosisHistory(patientId);
  }

  // ============================================================
  // Diagnostic Test Endpoints (MB-005, MB-006)
  // ============================================================

  @Get('tests/catalog')
  async getTestCatalog(@Query('category') category?: string) {
    return this.mbbsService.getTestCatalog(category);
  }

  @Post('patients/:id/test-orders')
  @HttpCode(HttpStatus.CREATED)
  async orderTests(
    @Param('id') patientId: string,
    @Body() dto: CreateTestOrderDto,
    @Req() req: any,
  ) {
    const doctorUserId = await this.getDoctorUserId(req);
    return this.mbbsService.orderTests(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/test-orders')
  async getTestOrders(@Param('id') patientId: string) {
    return this.mbbsService.getTestOrders(patientId);
  }

  @Get('test-orders/:id/requisition')
  async getRequisition(@Param('id') orderId: string, @Req() req: any) {
    // For now, delegate to the test orders endpoint
    // In production, this would generate a PDF
    const patientId = req.query?.patient_id;
    return this.mbbsService.getTestOrders(patientId || orderId);
  }

  // ============================================================
  // Test Results Endpoints (MB-008)
  // ============================================================

  @Get('patients/:id/test-results')
  async getTestResults(@Param('id') patientId: string) {
    return this.mbbsService.getTestResults(patientId);
  }

  // ============================================================
  // Referral Endpoints (MB-009)
  // ============================================================

  @Post('patients/:id/referrals')
  @HttpCode(HttpStatus.CREATED)
  async createReferral(
    @Param('id') patientId: string,
    @Body() dto: CreateReferralDto,
    @Req() req: any,
  ) {
    const doctorUserId = await this.getDoctorUserId(req);
    return this.mbbsService.createReferral(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/referrals')
  async getReferralHistory(@Param('id') patientId: string) {
    return this.mbbsService.getReferralHistory(patientId);
  }

  // ============================================================
  // Referral Chain Endpoints (MB-010)
  // ============================================================

  @Get('patients/:id/referral-chain')
  async getReferralChain(@Param('id') patientId: string) {
    return this.mbbsService.getReferralChain(patientId);
  }

  // ============================================================
  // Prescription Endpoints (MB-011, MB-012)
  // ============================================================

  @Post('patients/:id/prescriptions')
  @HttpCode(HttpStatus.CREATED)
  async createPrescription(
    @Param('id') patientId: string,
    @Body() dto: CreatePrescriptionDto,
    @Req() req: any,
  ) {
    const doctorUserId = await this.getDoctorUserId(req);
    return this.mbbsService.createPrescription(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/prescriptions')
  async getPrescriptionHistory(@Param('id') patientId: string) {
    return this.mbbsService.getPrescriptionHistory(patientId);
  }

  // ============================================================
  // Emergency Flag Endpoints (MB-014)
  // ============================================================

  @Post('patients/:id/emergency-flag')
  @HttpCode(HttpStatus.CREATED)
  async setEmergencyFlag(
    @Param('id') patientId: string,
    @Body() dto: CreateEmergencyFlagDto,
    @Req() req: any,
  ) {
    const doctorUserId = await this.getDoctorUserId(req);
    return this.mbbsService.setEmergencyFlag(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/emergency-flags')
  async getEmergencyFlags(@Param('id') patientId: string) {
    return this.mbbsService.getEmergencyFlags(patientId);
  }

  // ============================================================
  // Schedule Endpoints
  // ============================================================

  @Get('schedule')
  async getDoctorSchedule(@Req() req: any) {
    const doctorUserId = await this.getDoctorUserId(req);
    return this.mbbsService.getDoctorSchedule(doctorUserId);
  }

  // ============================================================
  // Differential Diagnosis (MB-013) — Stub
  // ============================================================

  @Get('patients/:id/differential-diagnosis')
  async getDifferentialDiagnosis(@Param('id') patientId: string) {
    return this.mbbsService.getDifferentialDiagnosis(patientId);
  }
}
