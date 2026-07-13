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
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SpecialistTemplateService } from './specialist-template.service';
import { CreateSpecialistReportDto } from './dto/create-specialist-report.dto';

@Controller('api/specialist')
export class SpecialistTemplateController {
  private readonly logger = new Logger('SpecialistTemplate');

  constructor(
    private readonly specialistTemplateService: SpecialistTemplateService,
  ) {}

  @Get('templates')
  @UseGuards(AuthGuard('jwt'))
  async getTemplates(@Query('specialtyCode') specialtyCode?: string) {
    if (!specialtyCode) {
      throw new BadRequestException('specialtyCode is required');
    }

    return this.specialistTemplateService.getTemplates(specialtyCode);
  }

  @Get('templates/:id')
  @UseGuards(AuthGuard('jwt'))
  async getTemplate(@Param('id') id?: string) {
    if (!id) {
      throw new BadRequestException('template id is required');
    }

    const template = await this.specialistTemplateService.getTemplate(id);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard('jwt'))
  async createReport(@Body() body: CreateSpecialistReportDto) {
    this.logger.log(
      `Saving specialist report for referral ${body.referralId} using template ${body.templateId}`,
    );

    return this.specialistTemplateService.createReport(body);
  }
}
