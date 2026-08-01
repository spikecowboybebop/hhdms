import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateVitalsDto,
  CreateMedicationAdminDto,
  CreateIvFluidDto,
  UpdateIvFluidDto,
  CreateWoundCareDto,
  CreateHandoverDto,
  CreateConsultationRequestDto,
  CreateSupplyUsageDto,
  CreateFeedingLogDto,
  CreateGrowthRecordDto,
  CreateVaccinationRecordDto,
} from './dto';

@Injectable()
export class NurseService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyNurse(userId: string) {
    const profile = await this.prisma.nurse_profiles.findUnique({
      where: { user_id: userId },
    });
    if (!profile) {
      throw new ForbiddenException('Only nurses can access this resource.');
    }
    return profile;
  }

  private async getPatientName(patientId: string) {
    const p = await this.prisma.patients.findUnique({
      where: { id: patientId },
      select: { first_name_en: true, last_name_en: true },
    });
    return p ? `${p.first_name_en} ${p.last_name_en}`.trim() : 'Unknown';
  }

  private async getUserName(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstNameEn: true, lastNameEn: true },
    });
    return u ? `${u.firstNameEn} ${u.lastNameEn}`.trim() : 'Unknown';
  }

  // ══════════════════════════════════════════════════════════════
  // Profile
  // ══════════════════════════════════════════════════════════════

  async getProfile(userId: string) {
    await this.verifyNurse(userId);
    const profile = await this.prisma.nurse_profiles.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: {
            firstNameEn: true,
            lastNameEn: true,
          },
        },
      },
    });
    return {
      user: {
        first_name_en: profile?.user.firstNameEn,
        last_name_en: profile?.user.lastNameEn,
      },
      nurse_type: profile?.nurse_type,
      specialization: profile?.specialization,
      license_number: profile?.license_number,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Patients
  // ══════════════════════════════════════════════════════════════

  async getMyPatients(userId: string) {
    await this.verifyNurse(userId);
    const assignments = await this.prisma.nurse_patient_assignments.findMany({
      where: { nurse_id: userId, status: 'ACTIVE' },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            phone_number: true,
            date_of_birth: true,
            sex: true,
            blood_group: true,
            patient_type: true,
            address_line1: true,
            district: true,
          },
        },
      },
      orderBy: { assigned_at: 'desc' },
    });

    return assignments.map((a) => {
      const p = a.patient;
      let ageYears: number | null = null;
      if (p.date_of_birth) {
        const dob = new Date(p.date_of_birth);
        const now = new Date();
        ageYears = now.getFullYear() - dob.getFullYear();
        if (
          now.getMonth() < dob.getMonth() ||
          (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
        ) {
          ageYears--;
        }
      }
      return {
        ...p,
        date_of_birth: p.date_of_birth?.toISOString() ?? null,
        age_years: ageYears,
        nurse_type: null,
      };
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Schedule
  // ══════════════════════════════════════════════════════════════

  async getSchedule(userId: string, date?: string) {
    await this.verifyNurse(userId);
    const where: any = { nurse_id: userId };
    if (date) {
      where.scheduled_date = new Date(date);
    }
    const entries = await this.prisma.nurse_schedule_entries.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            phone_number: true,
          },
        },
      },
      orderBy: [{ scheduled_date: 'asc' }, { scheduled_time_slot: 'asc' }],
    });
    return entries.map((e) => ({
      ...e,
      scheduled_date: e.scheduled_date?.toISOString() ?? null,
      patient: e.patient,
    }));
  }

  // ══════════════════════════════════════════════════════════════
  // Vital Signs
  // ══════════════════════════════════════════════════════════════

  async getPatientVitals(userId: string, patientId: string) {
    await this.verifyNurse(userId);
    const records = await this.prisma.nurse_vital_signs.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { recorded_at: 'desc' },
      take: 50,
    });
    return records.map((r) => ({
      ...r,
      recorded_at: r.recorded_at?.toISOString() ?? null,
      temperature_c: r.temperature_c?.toNumber() ?? null,
      blood_glucose: r.blood_glucose?.toNumber() ?? null,
      previous_vitals: null,
    }));
  }

  async createVitals(userId: string, dto: CreateVitalsDto) {
    await this.verifyNurse(userId);
    // Determine if abnormal
    let isAbnormal = false;
    if (dto.systolic_bp && (dto.systolic_bp > 140 || dto.systolic_bp < 90))
      isAbnormal = true;
    if (dto.diastolic_bp && (dto.diastolic_bp > 90 || dto.diastolic_bp < 60))
      isAbnormal = true;
    if (dto.pulse_bpm && (dto.pulse_bpm > 100 || dto.pulse_bpm < 60))
      isAbnormal = true;
    if (dto.spo2_pct && dto.spo2_pct < 90) isAbnormal = true;
    if (dto.temperature_c && (dto.temperature_c > 38.0 || dto.temperature_c < 35.0))
      isAbnormal = true;

    const record = await this.prisma.nurse_vital_signs.create({
      data: {
        patient_id: dto.patient_id,
        nurse_id: userId,
        systolic_bp: dto.systolic_bp,
        diastolic_bp: dto.diastolic_bp,
        pulse_bpm: dto.pulse_bpm,
        temperature_c: dto.temperature_c,
        spo2_pct: dto.spo2_pct,
        respiratory_rate: dto.respiratory_rate,
        blood_glucose: dto.blood_glucose,
        notes: dto.notes,
        is_abnormal: isAbnormal,
      },
    });
    return {
      id: record.id,
      is_abnormal: record.is_abnormal,
      recorded_at: record.recorded_at?.toISOString(),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Medication Administration
  // ══════════════════════════════════════════════════════════════

  async getMedicationAdministrations(userId: string, patientId: string) {
    await this.verifyNurse(userId);
    const entries = await this.prisma.nurse_medication_administrations.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { administered_at: 'desc' },
    });
    const patientName = await this.getPatientName(patientId);
    return {
      patient_id: patientId,
      patient_name: patientName,
      visit_date: new Date().toISOString().split('T')[0],
      entries: entries.map((e) => ({
        ...e,
        administered_at: e.administered_at?.toISOString() ?? null,
      })),
    };
  }

  async createMedicationAdministration(
    userId: string,
    dto: CreateMedicationAdminDto,
  ) {
    await this.verifyNurse(userId);
    const nurseName = await this.getUserName(userId);
    const record = await this.prisma.nurse_medication_administrations.create({
      data: {
        patient_id: dto.patient_id,
        nurse_id: userId,
        drug_name: dto.drug_name,
        dosage: dto.dosage,
        route: dto.route,
        notes: dto.notes,
        nurse_name: nurseName,
      },
    });
    return { id: record.id };
  }

  // ══════════════════════════════════════════════════════════════
  // IV Fluid Monitoring
  // ══════════════════════════════════════════════════════════════

  async getIvFluidRecords(userId: string, patientId: string) {
    await this.verifyNurse(userId);
    const records = await this.prisma.nurse_iv_fluid_records.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { started_at: 'desc' },
    });
    return records.map((r) => ({
      ...r,
      rate_ml_hr: r.rate_ml_hr?.toNumber() ?? null,
      volume_given_ml: r.volume_given_ml?.toNumber() ?? null,
      started_at: r.started_at?.toISOString() ?? null,
      stopped_at: r.stopped_at?.toISOString() ?? null,
      hourly_balance: [],
    }));
  }

  async createIvFluidRecord(userId: string, dto: CreateIvFluidDto) {
    await this.verifyNurse(userId);
    const record = await this.prisma.nurse_iv_fluid_records.create({
      data: {
        patient_id: dto.patient_id,
        nurse_id: userId,
        fluid_type: dto.fluid_type,
        rate_ml_hr: dto.rate_ml_hr,
        site_condition: dto.site_condition,
      },
    });
    return { id: record.id };
  }

  async updateIvFluidRecord(
    userId: string,
    recordId: string,
    dto: UpdateIvFluidDto,
  ) {
    await this.verifyNurse(userId);
    const existing = await this.prisma.nurse_iv_fluid_records.findUnique({
      where: { id: recordId },
    });
    if (!existing || existing.nurse_id !== userId) {
      throw new NotFoundException('IV fluid record not found.');
    }
    const updated = await this.prisma.nurse_iv_fluid_records.update({
      where: { id: recordId },
      data: {
        rate_ml_hr: dto.rate_ml_hr,
        volume_given_ml: dto.volume_given_ml,
        site_condition: dto.site_condition,
        status: dto.status,
        stopped_at: dto.status === 'COMPLETED' ? new Date() : undefined,
      },
    });
    return { id: updated.id };
  }

  // ══════════════════════════════════════════════════════════════
  // Wound Care
  // ══════════════════════════════════════════════════════════════

  async getWoundCareRecords(userId: string, patientId: string) {
    await this.verifyNurse(userId);
    const records = await this.prisma.nurse_wound_care_records.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { recorded_at: 'desc' },
    });
    return records.map((r) => ({
      ...r,
      latitude: r.latitude?.toNumber() ?? null,
      longitude: r.longitude?.toNumber() ?? null,
      recorded_at: r.recorded_at?.toISOString() ?? null,
      previous_records: [],
    }));
  }

  async createWoundCareRecord(userId: string, dto: CreateWoundCareDto) {
    await this.verifyNurse(userId);
    const record = await this.prisma.nurse_wound_care_records.create({
      data: {
        patient_id: dto.patient_id,
        nurse_id: userId,
        wound_location: dto.wound_location,
        wound_measurements: dto.wound_measurements,
        wound_condition: dto.wound_condition,
        dressing_applied: dto.dressing_applied,
        healing_progress: dto.healing_progress,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
    return { id: record.id };
  }

  async uploadWoundPhoto(
    userId: string,
    patientId: string,
    fileUrl: string,
    woundId?: string,
  ) {
    await this.verifyNurse(userId);
    if (woundId) {
      await this.prisma.nurse_wound_care_records.update({
        where: { id: woundId },
        data: { photo_url: fileUrl },
      });
    }
    return {
      id: woundId ?? 'new',
      patient_id: patientId,
      file_name: fileUrl.split('/').pop() ?? 'photo.jpg',
      file_type: 'image/jpeg',
      file_size: 0,
      file_url: fileUrl,
      uploaded_at: new Date().toISOString(),
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Nursing Care Report
  // ══════════════════════════════════════════════════════════════

  async getCareReport(userId: string, patientId: string) {
    await this.verifyNurse(userId);
    const report = await this.prisma.nurse_care_reports.findFirst({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { generated_at: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
      },
    });
    if (!report) return null;
    return {
      ...report,
      visit_date: report.visit_date?.toISOString() ?? null,
      generated_at: report.generated_at?.toISOString() ?? null,
      patient: report.patient,
    };
  }

  async generateCareReport(userId: string, patientId: string) {
    await this.verifyNurse(userId);

    // Gather vitals summary
    const vitals = await this.prisma.nurse_vital_signs.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { recorded_at: 'desc' },
      take: 10,
    });
    const vitalsSummary = vitals
      .map(
        (v) =>
          `BP: ${v.systolic_bp ?? '-'}/${v.diastolic_bp ?? '-'} | Pulse: ${v.pulse_bpm ?? '-'} | Temp: ${v.temperature_c ?? '-'}C | SpO2: ${v.spo2_pct ?? '-'}%`,
      )
      .join('\n');

    // Gather medications summary
    const meds = await this.prisma.nurse_medication_administrations.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { administered_at: 'desc' },
      take: 10,
    });
    const medsSummary = meds
      .map((m) => `${m.dosage ?? ''} ${m.drug_name} (${m.route ?? 'oral'})`)
      .join('\n');

    // Gather wound care procedures
    const wounds = await this.prisma.nurse_wound_care_records.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { recorded_at: 'desc' },
      take: 10,
    });
    const procedures = wounds
      .map((w) => `Wound: ${w.wound_location ?? '-'} — ${w.dressing_applied ?? '-'} (Healing: ${w.healing_progress ?? '-'})`)
      .join('\n');

    const patientName = await this.getPatientName(patientId);

    const report = await this.prisma.nurse_care_reports.create({
      data: {
        patient_id: patientId,
        nurse_id: userId,
        vitals_summary: vitalsSummary || null,
        medications_summary: medsSummary || null,
        procedures_performed: procedures || null,
        patient_response: null,
        handover_notes: null,
      },
    });

    return {
      ...report,
      visit_date: report.visit_date?.toISOString() ?? null,
      generated_at: report.generated_at?.toISOString() ?? null,
      patient: { id: patientId, first_name_en: patientName },
    };
  }

  // ══════════════════════════════════════════════════════════════
  // Shift Handover
  // ══════════════════════════════════════════════════════════════

  async getHandovers(userId: string, patientId?: string) {
    await this.verifyNurse(userId);
    const where: any = { nurse_id: userId };
    if (patientId) where.patient_id = patientId;
    const handovers = await this.prisma.nurse_handovers.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            phone_number: true,
            date_of_birth: true,
            sex: true,
            blood_group: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return handovers.map((h) => ({
      ...h,
      shift_date: h.shift_date?.toISOString() ?? null,
      signed_at: h.signed_at?.toISOString() ?? null,
      created_at: h.created_at?.toISOString() ?? null,
      patient: h.patient,
    }));
  }

  async createHandover(userId: string, dto: CreateHandoverDto) {
    await this.verifyNurse(userId);
    const record = await this.prisma.nurse_handovers.create({
      data: {
        nurse_id: userId,
        patient_id: dto.patient_id,
        current_status: dto.current_status,
        active_concerns: dto.active_concerns,
        medications_due: dto.medications_due,
        physician_orders: dto.physician_orders,
        patient_instructions: dto.patient_instructions,
        handed_over_by: dto.handed_over_to_email,
      },
    });
    return { id: record.id };
  }

  async signHandover(userId: string, handoverId: string) {
    await this.verifyNurse(userId);
    const existing = await this.prisma.nurse_handovers.findUnique({
      where: { id: handoverId },
    });
    if (!existing || existing.nurse_id !== userId) {
      throw new NotFoundException('Handover not found.');
    }
    await this.prisma.nurse_handovers.update({
      where: { id: handoverId },
      data: { signed_at: new Date(), status: 'SIGNED' },
    });
    return { success: true };
  }

  // ══════════════════════════════════════════════════════════════
  // Doctor Consultation Request
  // ══════════════════════════════════════════════════════════════

  async getConsultationRequests(userId: string, patientId?: string) {
    await this.verifyNurse(userId);
    const where: any = { nurse_id: userId };
    if (patientId) where.patient_id = patientId;
    const requests = await this.prisma.nurse_consultation_requests.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            phone_number: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    return requests.map((r) => ({
      ...r,
      created_at: r.created_at?.toISOString() ?? null,
      responded_at: r.responded_at?.toISOString() ?? null,
      patient: r.patient,
    }));
  }

  async createConsultationRequest(
    userId: string,
    dto: CreateConsultationRequestDto,
  ) {
    await this.verifyNurse(userId);
    const record = await this.prisma.nurse_consultation_requests.create({
      data: {
        nurse_id: userId,
        patient_id: dto.patient_id,
        concern_summary: dto.concern_summary,
        urgency_level: dto.urgency_level ?? 'NORMAL',
      },
    });
    return { id: record.id };
  }

  // ══════════════════════════════════════════════════════════════
  // Supply Tracking
  // ══════════════════════════════════════════════════════════════

  async getSupplyUsage(userId: string, patientId?: string) {
    await this.verifyNurse(userId);
    const where: any = { nurse_id: userId };
    if (patientId) where.patient_id = patientId;
    const records = await this.prisma.nurse_supply_usage.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
      },
      orderBy: { recorded_at: 'desc' },
    });
    return records.map((r) => ({
      ...r,
      recorded_at: r.recorded_at?.toISOString() ?? null,
      patient: r.patient,
    }));
  }

  async createSupplyUsage(userId: string, dto: CreateSupplyUsageDto) {
    await this.verifyNurse(userId);
    const record = await this.prisma.nurse_supply_usage.create({
      data: {
        nurse_id: userId,
        patient_id: dto.patient_id,
        supply_name: dto.supply_name,
        quantity_used: dto.quantity_used ?? 1,
        unit: dto.unit,
      },
    });
    return { id: record.id };
  }

  // ══════════════════════════════════════════════════════════════
  // Pediatric: Feeding Logs
  // ══════════════════════════════════════════════════════════════

  async getFeedingLogs(userId: string, patientId: string) {
    await this.verifyNurse(userId);
    const records = await this.prisma.nurse_feeding_logs.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { recorded_at: 'desc' },
    });
    return records.map((r) => ({
      ...r,
      volume_ml: r.volume_ml?.toNumber() ?? null,
      recorded_at: r.recorded_at?.toISOString() ?? null,
    }));
  }

  async createFeedingLog(userId: string, dto: CreateFeedingLogDto) {
    await this.verifyNurse(userId);
    const record = await this.prisma.nurse_feeding_logs.create({
      data: {
        nurse_id: userId,
        patient_id: dto.patient_id,
        feeding_type: dto.feeding_type,
        volume_ml: dto.volume_ml,
        frequency: dto.frequency,
      },
    });
    return { id: record.id };
  }

  // ══════════════════════════════════════════════════════════════
  // Pediatric: Growth Records
  // ══════════════════════════════════════════════════════════════

  async getGrowthRecords(userId: string, patientId: string) {
    await this.verifyNurse(userId);
    const records = await this.prisma.nurse_growth_records.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { recorded_at: 'desc' },
    });
    return records.map((r) => ({
      ...r,
      weight_kg: r.weight_kg?.toNumber() ?? null,
      height_cm: r.height_cm?.toNumber() ?? null,
      head_circumference_cm: r.head_circumference_cm?.toNumber() ?? null,
      percentile_weight: r.percentile_weight?.toNumber() ?? null,
      percentile_height: r.percentile_height?.toNumber() ?? null,
      percentile_head: r.percentile_head?.toNumber() ?? null,
      recorded_at: r.recorded_at?.toISOString() ?? null,
    }));
  }

  async createGrowthRecord(userId: string, dto: CreateGrowthRecordDto) {
    await this.verifyNurse(userId);
    const record = await this.prisma.nurse_growth_records.create({
      data: {
        nurse_id: userId,
        patient_id: dto.patient_id,
        weight_kg: dto.weight_kg,
        height_cm: dto.height_cm,
        head_circumference_cm: dto.head_circumference_cm,
      },
    });
    return { id: record.id };
  }

  // ══════════════════════════════════════════════════════════════
  // Pediatric: Vaccinations
  // ══════════════════════════════════════════════════════════════

  async getVaccinationRecords(userId: string, patientId: string) {
    await this.verifyNurse(userId);
    const records = await this.prisma.nurse_vaccination_records.findMany({
      where: { patient_id: patientId, nurse_id: userId },
      orderBy: { administered_date: 'desc' },
    });
    return records.map((r) => ({
      ...r,
      administered_date: r.administered_date?.toISOString() ?? null,
      next_due_date: r.next_due_date?.toISOString() ?? null,
    }));
  }

  async createVaccinationRecord(
    userId: string,
    dto: CreateVaccinationRecordDto,
  ) {
    await this.verifyNurse(userId);
    const record = await this.prisma.nurse_vaccination_records.create({
      data: {
        nurse_id: userId,
        patient_id: dto.patient_id,
        vaccine_name: dto.vaccine_name,
        dose_number: dto.dose_number,
        administered_date: dto.next_due_date
          ? new Date()
          : undefined,
        next_due_date: dto.next_due_date
          ? new Date(dto.next_due_date)
          : undefined,
      },
    });
    return { id: record.id };
  }
}
