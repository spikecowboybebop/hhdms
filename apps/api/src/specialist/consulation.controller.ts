import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Controller('api/specialist') // 1. Base path: http://localhost:3001/specialist
export class ConsultationController {
  private readonly logger = new Logger('ConsultationController');

  @Post('complete') // 2. Sub path: /complete
  @HttpCode(HttpStatus.OK)
  async completeConsultation(@Body() body: any) {
    this.logger.log(`[DRY RUN] Received consultation submission successfully.`);
    return {
      success: true,
      message: 'NestJS captured the simulation successfully.',
      timestamp: new Date().toISOString(),
    };
  }
}
