import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { SpecialistService } from './specialist.service';
import { CompleteReferralDto } from './dto/complete-referral.dto';

@Controller('api/specialist')
export class SpecialistController {
  private readonly logger = new Logger('SpecialistBackendSandbox');

  constructor(private readonly specialistService: SpecialistService) {}

  @Get('referrals')
  async getIncomingReferrals(@Query('specialistId') specialistId?: string) {
    if (!specialistId) {
      throw new BadRequestException('specialistId is required');
    }

    return this.specialistService.getMyIncomingReferrals(specialistId);
  }

  @Get('by-specialty')
  async getSpecialistsBySpecialty(@Query('specialtyCode') specialtyCode?: string) {
    if (!specialtyCode) {
      throw new BadRequestException('specialtyCode is required');
    }

    return this.specialistService.getSpecialistsBySpecialty(specialtyCode);
  }

  @Get('referral/:referralId/patient-history')
  async getReferralPatientHistory(@Param('referralId') referralId?: string) {
    if (!referralId) {
      throw new BadRequestException('referralId is required');
    }

    return this.specialistService.getReferralPatientHistory(referralId);
  }

  @Get('dicom-studies')
  async getDicomStudies(@Query('specialistId') specialistId?: string) {
    if (!specialistId) {
      throw new BadRequestException('specialistId is required');
    }

    return this.specialistService.getSpecialistDicomStudies(specialistId);
  }

  @Get('reports')
  async getReports(@Query('specialistId') specialistId?: string) {
    if (!specialistId) {
      throw new BadRequestException('specialistId is required');
    }

    return this.specialistService.getSpecialistReports(specialistId);
  }

  @Post('consultation/complete')
  @HttpCode(HttpStatus.OK)
  async completeConsultation(@Body() body: CompleteReferralDto) {
    const { referralId, responseNotes, specialistId } = body;

    this.logger.log(`Received completion sync for referral ${referralId}`);
    this.logger.log(`Issued by specialist ${specialistId}`);
    this.logger.log(`Payload data received:\n${responseNotes}`);

    return this.specialistService.completeReferral(body);
  }
}
