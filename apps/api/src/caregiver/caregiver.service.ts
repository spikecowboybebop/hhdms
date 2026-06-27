import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityLogDto, CreateConditionReportDto } from './dto';

@Injectable()
export class CaregiverService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyCaregiver(userId: string) {
    const profile = await this.prisma.caregiver_profiles.findUnique({
      where: { user_id: userId },
    });
    if (!profile) {
      throw new ForbiddenException('Only caregivers can access this resource.');
    }
    return profile;
  }

  // ===================== Profile =====================

  async getProfile(userId: string) {
    await this.verifyCaregiver(userId);
    const profile = await this.prisma.caregiver_profiles.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            email: true,
            firstNameEn: true,
            lastNameEn: true,
            firstNameBn: true,
            lastNameBn: true,
          },
        },
        patient_assignments: {
          where: { status: 'ACTIVE' },
          include: {
            patient: {
              select: {
                id: true,
                mrn: true,
                first_name_en: true,
                last_name_en: true,
                sex: true,
                blood_group: true,
                phone_number: true,
                address_line1: true,
                district: true,
              },
            },
          },
        },
      },
    });
    return profile;
  }

  // ===================== Patients (CG-005 / CG-007) =====================

  async getMyPatients(userId: string) {
    await this.verifyCaregiver(userId);
    const assignments = await this.prisma.caregiver_patient_assignments.findMany({
      where: { caregiver_id: userId, status: 'ACTIVE' },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            sex: true,
            blood_group: true,
            phone_number: true,
            address_line1: true,
            district: true,
          },
        },
      },
    });
    return assignments.map((a) => ({
      ...a.patient,
      service_type: a.service_type,
      patient_type: a.patient_type,
    }));
  }

  // ===================== Activity Logs (CG-005) =====================

  async createActivityLog(userId: string, dto: CreateActivityLogDto) {
    await this.verifyCaregiver(userId);
    return this.prisma.caregiver_activity_logs.create({
      data: {
        caregiver_id: userId,
        patient_id: dto.patient_id,
        activity_type: dto.activity_type,
        notes: dto.notes,
      },
    });
  }

  async getActivityLogs(userId: string, patientId?: string) {
    await this.verifyCaregiver(userId);
    const where: any = { caregiver_id: userId };
    if (patientId) where.patient_id = patientId;
    return this.prisma.caregiver_activity_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        patient: {
          select: { id: true, first_name_en: true, last_name_en: true },
        },
      },
    });
  }

  // ===================== Condition Reports (CG-007) =====================

  async createConditionReport(userId: string, dto: CreateConditionReportDto) {
    await this.verifyCaregiver(userId);
    return this.prisma.caregiver_condition_reports.create({
      data: {
        caregiver_id: userId,
        patient_id: dto.patient_id,
        report_type: dto.report_type,
        description: dto.description,
        severity: dto.severity ?? 'MODERATE',
      },
    });
  }

  async getConditionReports(userId: string, patientId?: string) {
    await this.verifyCaregiver(userId);
    const where: any = { caregiver_id: userId };
    if (patientId) where.patient_id = patientId;
    return this.prisma.caregiver_condition_reports.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 50,
      include: {
        patient: {
          select: { id: true, first_name_en: true, last_name_en: true },
        },
      },
    });
  }

  // ===================== Send Alert (CG-007 - Dummy) =====================

  async sendAlert(userId: string, reportId: string, target: 'nurse' | 'doctor') {
    await this.verifyCaregiver(userId);
    const report = await this.prisma.caregiver_condition_reports.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Condition report not found.');
    if (report.caregiver_id !== userId) {
      throw new ForbiddenException('You can only send alerts for your own reports.');
    }

    if (target === 'nurse') {
      await this.prisma.caregiver_condition_reports.update({
        where: { id: reportId },
        data: { alert_sent_to_nurse: true },
      });
    } else {
      await this.prisma.caregiver_condition_reports.update({
        where: { id: reportId },
        data: { alert_sent_to_doctor: true },
      });
    }

    return {
      message: `Alert sent to ${target === 'nurse' ? 'Nurse' : 'MBBS Doctor'} successfully.`,
      report_id: reportId,
      target,
    };
  }
}
