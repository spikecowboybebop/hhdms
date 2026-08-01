import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { FileInterceptor, MemoryStorage } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { NurseService } from './nurse.service';
import {
  CreateVitalsDto,
  CreateMedicationAdminDto,
  CreateIvFluidDto,
  UpdateIvFluidDto,
  CreateWoundCareDto,
  CreateHandoverDto,
  CreateConsultationRequestDto,
  CreateSupplyUsageDto,
  CreateFeedingLogDto,
  CreateGrowthRecordDto,
  CreateVaccinationRecordDto,
} from './dto';

@Controller('nurse')
@UseGuards(AuthGuard('jwt'))
export class NurseController {
  constructor(private readonly nurseService: NurseService) {}

  private getUserId(req: any): string {
    return req.user?.sub;
  }

  // ═══════════════ Profile ═══════════════

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.nurseService.getProfile(this.getUserId(req));
  }

  // ═══════════════ Patients ═══════════════

  @Get('patients')
  async getMyPatients(@Req() req: any) {
    return this.nurseService.getMyPatients(this.getUserId(req));
  }

  @Post('patients/assign')
  @HttpCode(HttpStatus.CREATED)
  async assignPatient(
    @Req() req: any,
    @Body('patient_id') patientId: string,
  ) {
    return this.nurseService.assignPatient(this.getUserId(req), patientId);
  }

  @Delete('patients/:id/unassign')
  @HttpCode(HttpStatus.OK)
  async unassignPatient(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.unassignPatient(this.getUserId(req), patientId);
  }

  // ═══════════════ Schedule ═══════════════

  @Get('schedule')
  async getSchedule(
    @Req() req: any,
    @Query('date') date?: string,
  ) {
    return this.nurseService.getSchedule(this.getUserId(req), date);
  }

  // ═══════════════ Vital Signs ═══════════════

  @Get('patients/:id/vitals')
  async getPatientVitals(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.getPatientVitals(this.getUserId(req), patientId);
  }

  @Post('patients/:id/vitals')
  @HttpCode(HttpStatus.CREATED)
  async createVitals(
    @Req() req: any,
    @Param('id') patientId: string,
    @Body() dto: CreateVitalsDto,
  ) {
    dto.patient_id = patientId;
    return this.nurseService.createVitals(this.getUserId(req), dto);
  }

  // ═══════════════ Medication Administration ═══════════════

  @Get('patients/:id/medication-admin')
  async getMedicationAdministrations(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.getMedicationAdministrations(
      this.getUserId(req),
      patientId,
    );
  }

  @Post('patients/:id/medication-admin')
  @HttpCode(HttpStatus.CREATED)
  async createMedicationAdministration(
    @Req() req: any,
    @Param('id') patientId: string,
    @Body() dto: CreateMedicationAdminDto,
  ) {
    dto.patient_id = patientId;
    return this.nurseService.createMedicationAdministration(
      this.getUserId(req),
      dto,
    );
  }

  // ═══════════════ IV Fluid Monitoring ═══════════════

  @Get('patients/:id/iv-fluids')
  async getIvFluidRecords(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.getIvFluidRecords(this.getUserId(req), patientId);
  }

  @Post('patients/:id/iv-fluids')
  @HttpCode(HttpStatus.CREATED)
  async createIvFluidRecord(
    @Req() req: any,
    @Param('id') patientId: string,
    @Body() dto: CreateIvFluidDto,
  ) {
    dto.patient_id = patientId;
    return this.nurseService.createIvFluidRecord(this.getUserId(req), dto);
  }

  @Patch('iv-fluids/:id')
  async updateIvFluidRecord(
    @Req() req: any,
    @Param('id') recordId: string,
    @Body() dto: UpdateIvFluidDto,
  ) {
    return this.nurseService.updateIvFluidRecord(
      this.getUserId(req),
      recordId,
      dto,
    );
  }

  // ═══════════════ Wound Care ═══════════════

  @Get('patients/:id/wound-care')
  async getWoundCareRecords(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.getWoundCareRecords(
      this.getUserId(req),
      patientId,
    );
  }

  @Post('patients/:id/wound-care')
  @HttpCode(HttpStatus.CREATED)
  async createWoundCareRecord(
    @Req() req: any,
    @Param('id') patientId: string,
    @Body() dto: CreateWoundCareDto,
  ) {
    dto.patient_id = patientId;
    return this.nurseService.createWoundCareRecord(this.getUserId(req), dto);
  }

  @Post('patients/:id/wound-care/photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadWoundPhoto(
    @Req() req: any,
    @Param('id') patientId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('wound_id') woundId?: string,
  ) {
    if (!file) throw new BadRequestException('Photo file is required.');

    // Upload to UploadCare
    const cdnBase = process.env.UPLOADCARE_CDN_BASE || 'https://ucarecdn.com';
    const formData = new FormData();
    formData.append('UPLOADCARE_PUB_KEY', process.env.UPLOADCARE_PUB_KEY!);
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });
    formData.append('file', blob, file.originalname);

    const ucRes = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: formData,
    });
    if (!ucRes.ok) {
      const body = await ucRes.text().catch(() => '');
      throw new BadRequestException(
        `UploadCare upload failed: ${ucRes.status} ${body}`,
      );
    }
    const ucData = (await ucRes.json()) as { file: string };
    const fileUrl = `${cdnBase}/${ucData.file}/${file.originalname}`;

    return this.nurseService.uploadWoundPhoto(
      this.getUserId(req),
      patientId,
      fileUrl,
      woundId,
    );
  }

  // ═══════════════ Nursing Care Report ═══════════════

  @Get('patients/:id/care-report')
  async getCareReport(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.getCareReport(this.getUserId(req), patientId);
  }

  @Post('patients/:id/care-report')
  @HttpCode(HttpStatus.CREATED)
  async generateCareReport(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.generateCareReport(this.getUserId(req), patientId);
  }

  // ═══════════════ Shift Handover ═══════════════

  @Get('handovers')
  async getHandovers(
    @Req() req: any,
    @Query('patient_id') patientId?: string,
  ) {
    return this.nurseService.getHandovers(this.getUserId(req), patientId);
  }

  @Post('handovers')
  @HttpCode(HttpStatus.CREATED)
  async createHandover(
    @Req() req: any,
    @Body() dto: CreateHandoverDto,
  ) {
    return this.nurseService.createHandover(this.getUserId(req), dto);
  }

  @Post('handovers/:id/sign')
  @HttpCode(HttpStatus.OK)
  async signHandover(
    @Req() req: any,
    @Param('id') handoverId: string,
  ) {
    return this.nurseService.signHandover(this.getUserId(req), handoverId);
  }

  // ═══════════════ Doctor Consultation Request ═══════════════

  @Get('consultation-requests')
  async getConsultationRequests(
    @Req() req: any,
    @Query('patient_id') patientId?: string,
  ) {
    return this.nurseService.getConsultationRequests(
      this.getUserId(req),
      patientId,
    );
  }

  @Post('consultation-requests')
  @HttpCode(HttpStatus.CREATED)
  async createConsultationRequest(
    @Req() req: any,
    @Body() dto: CreateConsultationRequestDto,
  ) {
    return this.nurseService.createConsultationRequest(
      this.getUserId(req),
      dto,
    );
  }

  // ═══════════════ Supply Tracking ═══════════════

  @Get('supply-usage')
  async getSupplyUsage(
    @Req() req: any,
    @Query('patient_id') patientId?: string,
  ) {
    return this.nurseService.getSupplyUsage(this.getUserId(req), patientId);
  }

  @Post('supply-usage')
  @HttpCode(HttpStatus.CREATED)
  async createSupplyUsage(
    @Req() req: any,
    @Body() dto: CreateSupplyUsageDto,
  ) {
    return this.nurseService.createSupplyUsage(this.getUserId(req), dto);
  }

  // ═══════════════ Pediatric: Feeding Logs ═══════════════

  @Get('patients/:id/feeding-logs')
  async getFeedingLogs(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.getFeedingLogs(this.getUserId(req), patientId);
  }

  @Post('patients/:id/feeding-logs')
  @HttpCode(HttpStatus.CREATED)
  async createFeedingLog(
    @Req() req: any,
    @Param('id') patientId: string,
    @Body() dto: CreateFeedingLogDto,
  ) {
    dto.patient_id = patientId;
    return this.nurseService.createFeedingLog(this.getUserId(req), dto);
  }

  // ═══════════════ Pediatric: Growth Records ═══════════════

  @Get('patients/:id/growth-records')
  async getGrowthRecords(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.getGrowthRecords(this.getUserId(req), patientId);
  }

  @Post('patients/:id/growth-records')
  @HttpCode(HttpStatus.CREATED)
  async createGrowthRecord(
    @Req() req: any,
    @Param('id') patientId: string,
    @Body() dto: CreateGrowthRecordDto,
  ) {
    dto.patient_id = patientId;
    return this.nurseService.createGrowthRecord(this.getUserId(req), dto);
  }

  // ═══════════════ Pediatric: Vaccinations ═══════════════

  @Get('patients/:id/vaccinations')
  async getVaccinationRecords(
    @Req() req: any,
    @Param('id') patientId: string,
  ) {
    return this.nurseService.getVaccinationRecords(
      this.getUserId(req),
      patientId,
    );
  }

  @Post('patients/:id/vaccinations')
  @HttpCode(HttpStatus.CREATED)
  async createVaccinationRecord(
    @Req() req: any,
    @Param('id') patientId: string,
    @Body() dto: CreateVaccinationRecordDto,
  ) {
    dto.patient_id = patientId;
    return this.nurseService.createVaccinationRecord(
      this.getUserId(req),
      dto,
    );
  }
}
