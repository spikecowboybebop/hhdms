import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MbbsService } from './mbbs.service';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { CreateTestOrderDto } from './dto/create-test-order.dto';
import { CreateReferralDto } from './dto/create-referral.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateEmergencyFlagDto } from './dto/create-emergency-flag.dto';
import { UpdateSignatureDto } from './dto/update-signature.dto';

@Controller('mbbs')
@UseGuards(AuthGuard('jwt'))
export class MbbsController {
  constructor(private readonly mbbsService: MbbsService) {}

  private getDoctorUserId(req: any): string {
    return req.user?.sub;
  }

  // ============================================================
  // Patient Endpoints (MB-002)
  // ============================================================

  @Get('patients')
  async getMyPatients(@Req() req: any) {
    const doctorUserId = this.getDoctorUserId(req);
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
    const doctorUserId = this.getDoctorUserId(req);
    return this.mbbsService.recordVitalSigns(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/vitals')
  async getVitalSignsHistory(@Param('id') patientId: string) {
    return this.mbbsService.getVitalSignsHistory(patientId);
  }

  // ============================================================
  // Diagnosis Endpoints (MB-004)
  // ============================================================

  @Post('patients/:id/diagnoses')
  @HttpCode(HttpStatus.CREATED)
  async createDiagnosis(
    @Param('id') patientId: string,
    @Body() dto: CreateDiagnosisDto,
    @Req() req: any,
  ) {
    const doctorUserId = this.getDoctorUserId(req);
    return this.mbbsService.createDiagnosis(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/diagnoses')
  async getDiagnosisHistory(@Param('id') patientId: string) {
    return this.mbbsService.getDiagnosisHistory(patientId);
  }

  // ============================================================
  // Diagnostic Test Orders (MB-005)
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
    const doctorUserId = this.getDoctorUserId(req);
    return this.mbbsService.orderTests(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/test-orders')
  async getTestOrders(@Param('id') patientId: string) {
    return this.mbbsService.getTestOrders(patientId);
  }

  // ============================================================
  // Referral Endpoints (MB-006)
  // ============================================================

  @Post('patients/:id/referrals')
  @HttpCode(HttpStatus.CREATED)
  async createReferral(
    @Param('id') patientId: string,
    @Body() dto: CreateReferralDto,
    @Req() req: any,
  ) {
    const doctorUserId = this.getDoctorUserId(req);
    return this.mbbsService.createReferral(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/referrals')
  async getReferralHistory(@Param('id') patientId: string) {
    return this.mbbsService.getReferralHistory(patientId);
  }

  // ============================================================
  // Prescription Endpoints (MB-007)
  // ============================================================

  @Post('patients/:id/prescriptions')
  @HttpCode(HttpStatus.CREATED)
  async createPrescription(
    @Param('id') patientId: string,
    @Body() dto: CreatePrescriptionDto,
    @Req() req: any,
  ) {
    const doctorUserId = this.getDoctorUserId(req);
    return this.mbbsService.createPrescription(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/prescriptions')
  async getPrescriptionHistory(@Param('id') patientId: string) {
    return this.mbbsService.getPrescriptionHistory(patientId);
  }

  // ============================================================
  // Emergency Flag Endpoints (MB-008)
  // ============================================================

  @Post('patients/:id/emergency')
  @HttpCode(HttpStatus.CREATED)
  async setEmergencyFlag(
    @Param('id') patientId: string,
    @Body() dto: CreateEmergencyFlagDto,
    @Req() req: any,
  ) {
    const doctorUserId = this.getDoctorUserId(req);
    return this.mbbsService.setEmergencyFlag(patientId, doctorUserId, dto);
  }

  @Get('patients/:id/emergency')
  async getEmergencyFlags(@Param('id') patientId: string) {
    return this.mbbsService.getEmergencyFlags(patientId);
  }

  // ============================================================
  // Digital Signature
  // ============================================================

  @Get('signature')
  async getSignature(@Req() req: any) {
    const doctorUserId = this.getDoctorUserId(req);
    return this.mbbsService.getSignature(doctorUserId);
  }

  @Patch('signature')
  async updateSignature(@Body() dto: UpdateSignatureDto, @Req() req: any) {
    const doctorUserId = this.getDoctorUserId(req);
    return this.mbbsService.updateSignature(doctorUserId, dto.signature_url);
  }

  // ============================================================
  // Doctor Profile
  // ============================================================

  @Get('doctor-profile')
  async getDoctorProfile(@Req() req: any) {
    const doctorUserId = this.getDoctorUserId(req);
    return this.mbbsService.getDoctorProfile(doctorUserId);
  }

  // ============================================================
  // Patient Documents
  // ============================================================

  @Post('patients/:id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadDocument(
    @Param('id') patientId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required.');
    return this.mbbsService.uploadDocument(patientId, file);
  }

  @Get('patients/:id/documents')
  async getPatientDocuments(@Param('id') patientId: string) {
    return this.mbbsService.getPatientDocuments(patientId);
  }

  @Get('patients/:id/documents/:docId')
  async getDocumentDetails(
    @Param('id') patientId: string,
    @Param('docId') docId: string,
  ) {
    return this.mbbsService.getDocumentDetails(patientId, docId);
  }

  @Get('patients/:id/documents/:docId/text')
  async getDocumentText(
    @Param('id') patientId: string,
    @Param('docId') docId: string,
  ) {
    const text = await this.mbbsService.extractDocumentText(docId, patientId);
    return { text: text ?? '[No text could be extracted]' };
  }

  // ============================================================
  // ICD-10 Catalog  (MB-009)
  // ============================================================

  @Get('icd10/search')
  async searchIcd10Codes(@Query('q') query: string) {
    return this.mbbsService.searchIcd10Codes(query);
  }
}
