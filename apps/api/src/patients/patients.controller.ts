import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
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

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.patientsService.findById(id);
  }
}
