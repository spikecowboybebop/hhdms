import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { SpecialistDicomService } from './specialist-dicom.service';

@Controller('api/specialist/dicom')
export class SpecialistDicomController {
  private readonly logger = new Logger('SpecialistDicomController');

  constructor(
    private readonly specialistDicomService: SpecialistDicomService,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Query('patientId') patientId?: string) {
    return this.specialistDicomService.findAll(patientId);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string) {
    const study = await this.specialistDicomService.findOne(id);
    if (!study) throw new NotFoundException('DICOM study not found');
    return study;
  }

  @Get(':id/frame/:instance')
  async getFrame(
    @Param('id') id: string,
    @Param('instance') _instance: string,
    @Res() res: Response,
  ) {
    const study = await this.specialistDicomService.findOne(id);
    if (!study) throw new NotFoundException('DICOM study not found');

    const fileUrl = study.file_path;
    if (!fileUrl) throw new NotFoundException('No file associated with study');

    const response = await fetch(fileUrl);

    if (!response.ok) {
      this.logger.error(
        `Failed to fetch DICOM from ${fileUrl}: ${response.status}`,
      );
      throw new NotFoundException('Failed to fetch DICOM file');
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.set({
      'Content-Type': 'application/dicom',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    res.send(buffer);
  }
}
