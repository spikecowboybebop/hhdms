import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: CreatePatientDto) {
    return this.patientsService.register(dto);
  }

  @Get()
  async findByBookedBy(@Query('booked_by') bookedBy: string) {
    return this.patientsService.findByBookedBy(bookedBy);
  }
}
