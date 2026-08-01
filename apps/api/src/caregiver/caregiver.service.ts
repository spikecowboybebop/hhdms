import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateActivityLogDto,
  CreateConditionReportDto,
  CreateCheckInDto,
  CreateCheckOutDto,
} from './dto';

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

  // ══════════════════════════════════════════════════════════════
  // Helper: Calculate distance between two GPS coordinates (Haversine)
  // ══════════════════════════════════════════════════════════════
  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    const assignments =
      await this.prisma.caregiver_patient_assignments.findMany({
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

  // ===================== Send Alert (CG-007) =====================

  async sendAlert(
    userId: string,
    reportId: string,
    target: 'nurse' | 'doctor',
  ) {
    await this.verifyCaregiver(userId);
    const report = await this.prisma.caregiver_condition_reports.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Condition report not found.');
    if (report.caregiver_id !== userId) {
      throw new ForbiddenException(
        'You can only send alerts for your own reports.',
      );
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

  // ══════════════════════════════════════════════════════════════
  // CG-006: GPS Check-In/Out
  // ══════════════════════════════════════════════════════════════

  async checkIn(userId: string, dto: CreateCheckInDto) {
    await this.verifyCaregiver(userId);

    // Verify patient assignment exists
    const assignment =
      await this.prisma.caregiver_patient_assignments.findFirst({
        where: {
          caregiver_id: userId,
          patient_id: dto.patient_id,
          status: 'ACTIVE',
        },
      });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this patient.');
    }

    // Check for existing open check-in
    const existingOpen = await this.prisma.caregiver_check_in_out.findFirst({
      where: {
        caregiver_id: userId,
        check_out_time: null,
      },
    });
    if (existingOpen) {
      throw new BadRequestException(
        'You already have an active check-in. Please check out first.',
      );
    }

    // TODO: Integrate with patient address coordinates for geofence validation
    // For now, record the GPS coordinates and calculate distance if patient has address
    let distanceMeters: number | null = null;
    try {
      const patient = await this.prisma.patients.findUnique({
        where: { id: dto.patient_id },
        select: { latitude: true, longitude: true },
      } as any);
      if (patient && (patient as any).latitude && (patient as any).longitude) {
        distanceMeters = this.haversineDistance(
          dto.latitude,
          dto.longitude,
          Number((patient as any).latitude),
          Number((patient as any).longitude),
        );
      }
    } catch {
      // Patient coordinates not available — skip geofence check
    }

    // Get assignment for service_type
    const serviceType = assignment.service_type;

    const record = await this.prisma.caregiver_check_in_out.create({
      data: {
        caregiver_id: userId,
        patient_id: dto.patient_id,
        check_in_latitude: dto.latitude,
        check_in_longitude: dto.longitude,
        distance_meters: distanceMeters,
        status: 'CHECKED_IN',
      },
    });

    // Also create a timesheet entry (CG-008)
    await this.prisma.caregiver_timesheets.create({
      data: {
        caregiver_id: userId,
        patient_id: dto.patient_id,
        check_in_time: new Date(),
        service_type: serviceType,
        status: 'ACTIVE',
      },
    });

    return {
      message: 'Checked in successfully.',
      record,
      distance_meters: distanceMeters,
    };
  }

  async checkOut(userId: string, recordId: string, dto: CreateCheckOutDto) {
    await this.verifyCaregiver(userId);

    const record = await this.prisma.caregiver_check_in_out.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      throw new NotFoundException('Check-in record not found.');
    }
    if (record.caregiver_id !== userId) {
      throw new ForbiddenException(
        'You can only check out for your own shift.',
      );
    }
    if (record.check_out_time) {
      throw new BadRequestException('Already checked out.');
    }

    // Calculate distance for check-out
    const distanceMeters: number | null = record.distance_meters
      ? Number(record.distance_meters)
      : null;

    const updated = await this.prisma.caregiver_check_in_out.update({
      where: { id: recordId },
      data: {
        check_out_time: new Date(),
        check_out_latitude: dto.latitude,
        check_out_longitude: dto.longitude,
        status: 'CHECKED_OUT',
      },
    });

    // Update timesheet
    const checkInTime = record.check_in_time;
    if (checkInTime) {
      const totalHours =
        (Date.now() - new Date(checkInTime).getTime()) / (1000 * 60 * 60);
      await this.prisma.caregiver_timesheets.updateMany({
        where: {
          caregiver_id: userId,
          patient_id: record.patient_id,
          check_in_time: checkInTime,
        },
        data: {
          check_out_time: new Date(),
          total_hours: Math.round(totalHours * 100) / 100,
          status: 'COMPLETED',
        },
      });
    }

    return {
      message: 'Checked out successfully.',
      record: updated,
      total_hours:
        updated.check_out_time && checkInTime
          ? Math.round(
              ((new Date(updated.check_out_time).getTime() -
                new Date(checkInTime).getTime()) /
                (1000 * 60 * 60)) *
                100,
            ) / 100
          : null,
    };
  }

  async getCheckInOuts(userId: string, patientId?: string) {
    await this.verifyCaregiver(userId);
    const where: any = { caregiver_id: userId };
    if (patientId) where.patient_id = patientId;
    return this.prisma.caregiver_check_in_out.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 30,
      include: {
        patient: {
          select: {
            id: true,
            first_name_en: true,
            last_name_en: true,
            address_line1: true,
            district: true,
          },
        },
      },
    });
  }

  async getTodayCheckInOut(userId: string) {
    await this.verifyCaregiver(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.caregiver_check_in_out.findFirst({
      where: {
        caregiver_id: userId,
        created_at: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { created_at: 'desc' },
      include: {
        patient: {
          select: { first_name_en: true, last_name_en: true },
        },
      },
    });
  }

  // ══════════════════════════════════════════════════════════════
  // CG-008: Timesheets
  // ══════════════════════════════════════════════════════════════

  async getTimesheets(userId: string, month?: string) {
    await this.verifyCaregiver(userId);
    const where: any = { caregiver_id: userId };

    if (month) {
      // month format: "2026-07"
      const [year, mon] = month.split('-').map(Number);
      const start = new Date(year, mon - 1, 1);
      const end = new Date(year, mon, 1);
      where.shift_date = { gte: start, lt: end };
    }

    return this.prisma.caregiver_timesheets.findMany({
      where,
      orderBy: { shift_date: 'desc' },
      take: 100,
      include: {
        patient: {
          select: { id: true, first_name_en: true, last_name_en: true },
        },
      },
    });
  }
}
