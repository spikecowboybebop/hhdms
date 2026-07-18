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
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SpecialistService } from './specialist.service';
import { SpecialistPrescriptionService } from './specialist-prescription.service';
import { CreateSpecialistPrescriptionDto } from './dto/create-specialist-prescription.dto';
import { CompleteReferralDto } from './dto/complete-referral.dto';
import { CreateAdditionalTestOrderDto } from './dto/create-additional-test-order.dto';

@Controller('api/specialist')
export class SpecialistController {
  private readonly logger = new Logger('SpecialistBackendSandbox');

  constructor(
    private readonly specialistService: SpecialistService,
    private readonly specialistPrescriptionService: SpecialistPrescriptionService,
  ) {}

  private getUserId(req: any): string {
    return req.user?.sub;
  }

  @Get('routes')
  @UseGuards(AuthGuard('jwt'))
  async getMedicationRoutes() {
    return this.specialistService.getMedicationRoutes();
  }

  @Get('referrals')
  @UseGuards(AuthGuard('jwt'))
  async getIncomingReferrals(@Req() req: any) {
    const specialistId = this.getUserId(req);
    return this.specialistService.getMyIncomingReferrals(specialistId);
  }

  @Get('by-specialty')
  @UseGuards(AuthGuard('jwt'))
  async getSpecialistsBySpecialty(
    @Query('specialtyCode') specialtyCode?: string,
  ) {
    if (!specialtyCode) {
      throw new BadRequestException('specialtyCode is required');
    }

    return this.specialistService.getSpecialistsBySpecialty(specialtyCode);
  }

  @Get('referral/:referralId/patient-history')
  @UseGuards(AuthGuard('jwt'))
  async getReferralPatientHistory(@Param('referralId') referralId?: string) {
    if (!referralId) {
      throw new BadRequestException('referralId is required');
    }

    return this.specialistService.getReferralPatientHistory(referralId);
  }

  @Get('reports')
  @UseGuards(AuthGuard('jwt'))
  async getReports(@Req() req: any) {
    const specialistId = this.getUserId(req);
    return this.specialistService.getSpecialistReports(specialistId);
  }

  @Get('tests/catalog')
  @UseGuards(AuthGuard('jwt'))
  async getTestCatalog(@Query('category') category?: string) {
    return this.specialistService.getTestCatalog(category);
  }

  @Post('tests/order')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  async orderAdditionalTests(
    @Body() dto: CreateAdditionalTestOrderDto,
    @Req() req: any,
  ) {
    const specialistId = this.getUserId(req);
    return this.specialistService.orderAdditionalTests(specialistId, dto);
  }

  @Get('tests/orders/:referralId')
  @UseGuards(AuthGuard('jwt'))
  async getTestOrders(@Param('referralId') referralId: string) {
    return this.specialistService.getTestOrdersByReferral(referralId);
  }

  @Post('consultation/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async completeConsultation(
    @Body() body: CompleteReferralDto,
    @Req() req: any,
  ) {
    const specialistId = this.getUserId(req);
    const { referralId, responseNotes } = body;

    this.logger.log(`Received completion sync for referral ${referralId}`);
    this.logger.log(`Issued by specialist ${specialistId}`);
    this.logger.log(`Payload data received:\n${responseNotes}`);

    return this.specialistService.completeReferral(specialistId, body);
  }

  @Post('prescriptions')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  async createPrescription(
    @Body() dto: CreateSpecialistPrescriptionDto,
    @Req() req: any,
  ) {
    const specialistId = this.getUserId(req);
    return this.specialistPrescriptionService.createPrescription(
      dto.referralId,
      specialistId,
      dto,
    );
  }

  @Get('prescriptions')
  @UseGuards(AuthGuard('jwt'))
  async getPrescriptions(@Query('referralId') referralId: string) {
    if (!referralId) {
      throw new BadRequestException('referralId is required');
    }
    return this.specialistPrescriptionService.getPrescriptions(referralId);
  }
}
