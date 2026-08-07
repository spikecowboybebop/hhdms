import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { CreateBookingSessionDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('create-session')
  @HttpCode(HttpStatus.CREATED)
  async createSession(@Body() dto: CreateBookingSessionDto) {
    return this.bookingsService.createSession(dto);
  }

  @Get('my-sessions')
  @UseGuards(AuthGuard('jwt'))
  async getMySessions(@Req() req: any) {
    return this.bookingsService.getUserSessions(req.user.sub);
  }

  @Get('session/:id')
  @UseGuards(AuthGuard('jwt'))
  async getSession(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub;
    const session = await this.bookingsService.getSessionById(id);
    if (!session) {
      throw new NotFoundException('Booking session not found');
    }
    const ownsSession = await this.bookingsService.userOwnsSession(
      session.patient_id,
      userId,
    );
    if (ownsSession) return session;

    // Check if user is an assigned provider for this session
    const isProvider = session.tickets.some(
      (t) => t.assigned_provider_id === userId,
    );
    if (isProvider) return session;

    const debugInfo = await this.bookingsService.debugAccess(
      userId,
      session.patient_id,
    );
    console.log(`[BOOKING_ACCESS] DENIED`, JSON.stringify(debugInfo, null, 2));
    throw new ForbiddenException(
      'You do not have access to this booking session',
    );
  }

  @Get('session/:id/reports')
  @UseGuards(AuthGuard('jwt'))
  async getSessionReports(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub;
    const session = await this.bookingsService.getSessionById(id);
    if (!session) {
      throw new NotFoundException('Booking session not found');
    }
    const ownsSession = await this.bookingsService.userOwnsSession(
      session.patient_id,
      userId,
    );
    if (!ownsSession) {
      const isProvider = session.tickets.some(
        (t) => t.assigned_provider_id === userId,
      );
      if (!isProvider) {
        throw new ForbiddenException(
          'You do not have access to this booking session',
        );
      }
    }
    const reports = await this.bookingsService.getSessionReports(id);
    return reports ?? [];
  }
}
