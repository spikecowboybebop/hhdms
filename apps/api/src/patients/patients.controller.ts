import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

  @Get('by-phone/:phone')
  async findByPhone(@Param('phone') phone: string) {
    return this.patientsService.findByPhone(phone);
  }

  @Get('self')
  @UseGuards(JwtAuthGuard)
  async getSelf(@Req() req: any) {
    return this.patientsService.findByUserId(req.user.sub);
  }

  @Patch('self')
  @UseGuards(JwtAuthGuard)
  async updateSelf(@Req() req: any, @Body() dto: UpdatePatientDto) {
    return this.patientsService.updateSelf(req.user.sub, dto);
  }

  @Get('self/documents')
  @UseGuards(JwtAuthGuard)
  async getSelfDocuments(@Req() req: any) {
    return this.patientsService.getSelfDocuments(req.user.sub);
  }

  @Get('self/reports')
  @UseGuards(JwtAuthGuard)
  async getSelfReports(@Req() req: any) {
    return this.patientsService.getSelfReports(req.user.sub);
  }

  @Post('self/documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadSelfDocument(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required.');
    return this.patientsService.uploadSelfDocument(req.user.sub, file);
  }

  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    return this.patientsService.findByEmail(email);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }
}
