import { Controller, Get, Post, Body, HttpCode, HttpStatus, Logger, Query, BadRequestException } from '@nestjs/common';
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