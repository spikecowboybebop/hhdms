import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { TeleconsultService } from './teleconsult.service';

@Controller('api/teleconsult')
export class TeleconsultController {
  constructor(private readonly teleconsultService: TeleconsultService) {}

  @Post('sessions')
  async createSession(
    @Body() body: { referralId: string; specialistId: string },
  ) {
    if (!body.referralId || !body.specialistId) {
      throw new BadRequestException('referralId and specialistId are required');
    }

    return this.teleconsultService.createSession(body.referralId, body.specialistId);
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    return this.teleconsultService.getSession(id);
  }

  @Get('sessions/by-referral/:referralId')
  async getSessionByReferral(@Param('referralId') referralId: string) {
    return this.teleconsultService.getSessionByReferral(referralId);
  }

  @Patch('sessions/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' },
  ) {
    if (!body.status) {
      throw new BadRequestException('status is required');
    }

    return this.teleconsultService.updateStatus(id, body.status);
  }
}
