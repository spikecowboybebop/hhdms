import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { CreateSpecialistReportDto } from './dto/create-specialist-report.dto';

@Injectable()
export class SpecialistTemplateService {
  constructor(private prisma: PrismaService) {}

  async getTemplates(specialtyCode: string) {
    return this.prisma.specialty_templates.findMany({
      where: {
        specialty_code: specialtyCode,
        is_active: true,
      },
      select: {
        id: true,
        template_name: true,
        description: true,
        schema: true,
      },
      orderBy: { template_name: 'asc' },
    });
  }

  async getTemplate(id: string) {
    return this.prisma.specialty_templates.findUnique({
      where: { id },
      select: {
        id: true,
        template_name: true,
        description: true,
        schema: true,
        specialty_code: true,
      },
    });
  }

  async createReport(dto: CreateSpecialistReportDto) {
    return this.prisma.specialist_reports.create({
      data: {
        referral_id: dto.referralId,
        template_id: dto.templateId,
        form_data: dto.formData as Prisma.InputJsonValue,
      },
    });
  }
}
