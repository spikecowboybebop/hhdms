import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';

@Controller('api/specialist')
export class SpecialistController {
  private readonly logger = new Logger('SpecialistBackendSandbox');

  @Post('consultation/complete')
  @HttpCode(HttpStatus.OK)
  async completeConsultation(@Body() body: { referralId: string; responseNotes: string; specialistId: string }) {
    const { referralId, responseNotes, specialistId } = body;

    // 1. Dry-Run Intercept Logging to Server Terminal
    this.logger.warn(`[DRY RUN ISOLATION ENGINE ACTIVATED]`);
    this.logger.log(`Received Completion Sync for Referral ID: ${referralId}`);
    this.logger.log(`Issued by Specialist ID: ${specialistId}`);
    this.logger.log(`Payload Data Received:\n${responseNotes}`);

    // 2. Return production-compliant contract structure without touching Prisma/DB
    return {
      success: true,
      message: "Simulation Successful: NestJS Gateway interceptor parsed data perfectly. Database skipped.",
      isSimulated: true,
      timestamp: new Date().toISOString(),
    };
  }
}