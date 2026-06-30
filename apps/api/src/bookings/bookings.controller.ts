import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
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
}
