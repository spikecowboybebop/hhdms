import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { CreateTestOrderDto } from './dto/create-test-order.dto';
import { CreateReferralDto } from './dto/create-referral.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateEmergencyFlagDto } from './dto/create-emergency-flag.dto';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as Tesseract from 'tesseract.js';
import sharp from 'sharp';

interface Icd10Entry {
  code: string;
  desc: string;
}

@Injectable()
export class MbbsService implements OnModuleInit {
  private icd10Codes: Icd10Entry[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    const jsonPath = path.resolve(__dirname, '../../prisma/icd10_codes.json');
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      this.icd10Codes = JSON.parse(raw);
      console.log(`Loaded ${this.icd10Codes.length} ICD-10 codes into memory`);
    } catch (err) {
      console.warn(
        'Could not load icd10_codes.json, falling back to DB search:',
        (err as Error).message,
      );
    }
  }

  // ============================================================
  // Patient Profile (MB-002)
  // ============================================================

  /**
   * Get all patients assigned to the logged-in MBBS doctor.
   * In production this would filter by appointment assignments.
   */
  async getMyPatients(doctorUserId: string) {
    // Verify this user has an MBBS doctor profile
    const doctorProfile = await this.prisma.mbbs_doctor_profiles.findUnique({
      where: { user_id: doctorUserId },
    });
    if (!doctorProfile) {
      throw new ForbiddenException(
        'Only MBBS doctors can access this resource.',
      );
    }

    // Fetch patients explicitly assigned to this doctor via the join table
    const assignments = await this.prisma.doctor_patient_assignments.findMany({
      where: { doctor_id: doctorUserId },
      include: { patient: true },
    });

    if (assignments.length === 0) {
      return [];
    }

    return assignments
      .map((a) => a.patient)
      .sort(
        (a, b) =>
          new Date(b.updated_at ?? 0).getTime() -
          new Date(a.updated_at ?? 0).getTime(),
      )
      .slice(0, 50);
  }

  /**
   * Get a single patient's full profile including history (MB-002)
   */
  async getPatientProfile(patientId: string) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found.');
    }

    // Fetch related records in parallel
    const [
      vitals,
      diagnoses,
      prescriptions,
      referrals,
      emergencyFlags,
      chainEvents,
      testOrders,
      prevAppointments,
      documents,
    ] = await Promise.all([
      this.prisma.patient_vital_signs.findMany({
        where: { patient_id: patientId },
        orderBy: { recorded_at: 'desc' },
        take: 20,
      }),
      this.prisma.patient_diagnoses.findMany({
        where: { patient_id: patientId },
        orderBy: { diagnosed_at: 'desc' },
        include: { icd10: true },
      }),
      this.prisma.prescriptions.findMany({
        where: { patient_id: patientId },
        orderBy: { issued_at: 'desc' },
        include: { medications: true },
      }),
      this.prisma.specialist_referrals.findMany({
        where: { patient_id: patientId },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.emergency_flags.findMany({
        where: { patient_id: patientId },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.referral_chain.findMany({
        where: { patient_id: patientId },
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.diagnostic_test_orders.findMany({
        where: { patient_id: patientId },
        orderBy: { ordered_at: 'desc' },
        include: { test: true, results: true },
      }),
      this.prisma.doctor_patient_assignments.findMany({
        where: { patient_id: patientId, appointment_activity: 'done' },
        orderBy: { assigned_at: 'desc' },
        include: {
          doctor: {
            include: {
              user: { select: { firstNameEn: true, lastNameEn: true } },
            },
          },
        },
      }),
      this.prisma.patient_documents.findMany({
        where: { patient_id: patientId },
        orderBy: { uploaded_at: 'desc' },
      }),
    ]);

    return {
      patient,
      vitals,
      diagnoses,
      prescriptions,
      referrals,
      emergency_flags: emergencyFlags,
      referral_chain: chainEvents,
      test_orders: testOrders,
      previous_appointments: prevAppointments,
      documents,
    };
  }

  /**
   * Start a patient visit — sends a push notification to the patient
   * that the doctor is on their way.
   */
  async startPatientVisit(doctorUserId: string, patientId: string) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    if (!patient.user_id) {
      throw new BadRequestException('Patient has no associated user account.');
    }

    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorUserId },
      select: { firstNameEn: true, lastNameEn: true },
    });
    if (!doctor) throw new NotFoundException('Doctor not found.');

    const doctorName = `Dr. ${doctor.firstNameEn} ${doctor.lastNameEn}`;

    await this.notificationsService.sendToUser(
      patient.user_id,
      {
        title: 'Doctor on the Way',
        body: `${doctorName} is coming to visit you.`,
      },
      { type: 'doctor_coming' },
    );

    return { message: 'Visit started', doctor_name: doctorName };
  }

  // ============================================================
  // Vital Signs (MB-003)
  // ============================================================

  /**
   * Record vital signs for a patient visit (MB-003).
   * Auto-flags out-of-range values as abnormal.
   */
  async recordVitalSigns(
    patientId: string,
    doctorUserId: string,
    dto: CreateVitalsDto,
  ) {
    // Verify patient exists
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    // Verify doctor profile
    const doctor = await this.prisma.mbbs_doctor_profiles.findUnique({
      where: { user_id: doctorUserId },
    });
    if (!doctor)
      throw new ForbiddenException('Only MBBS doctors can record vitals.');

    // Calculate BMI if weight and height are provided
    let bmi: number | undefined;
    if (dto.weight_kg && dto.height_cm) {
      const heightM = Number(dto.height_cm) / 100;
      bmi = Number((Number(dto.weight_kg) / (heightM * heightM)).toFixed(1));
    }

    // Auto-flag abnormal values
    const isAbnormal = this.checkVitalAbnormalities(dto);

    const vitals = await this.prisma.patient_vital_signs.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorUserId,
        systolic_bp: dto.systolic_bp,
        diastolic_bp: dto.diastolic_bp,
        pulse_bpm: dto.pulse_bpm,
        temperature_c: dto.temperature_c ? Number(dto.temperature_c) : null,
        spo2_pct: dto.spo2_pct,
        respiratory_rate: dto.respiratory_rate,
        weight_kg: dto.weight_kg ? Number(dto.weight_kg) : null,
        height_cm: dto.height_cm ? Number(dto.height_cm) : null,
        bmi,
        notes: dto.notes,
        is_abnormal: isAbnormal,
      },
    });

    // Update patient height/weight if provided
    if (dto.weight_kg || dto.height_cm) {
      await this.prisma.patients.update({
        where: { id: patientId },
        data: {
          ...(dto.weight_kg && { weight_kg: Number(dto.weight_kg) }),
          ...(dto.height_cm && { height_cm: Number(dto.height_cm) }),
          updated_at: new Date(),
        },
      });
    }

    // Log to referral chain
    await this.addReferralChainEvent(
      patientId,
      'VITAL_SIGNS',
      vitals.id,
      'Vital Signs Recorded',
      'MBBS_DOCTOR',
      `BP: ${dto.systolic_bp ?? '-'}/${dto.diastolic_bp ?? '-'}, HR: ${dto.pulse_bpm ?? '-'}, SpO2: ${dto.spo2_pct ?? '-'}%${isAbnormal ? ' ⚠️ ABNORMAL' : ''}`,
    );

    return vitals;
  }

  /**
   * Get vital signs history for a patient
   */
  async getVitalSignsHistory(patientId: string) {
    return await this.prisma.patient_vital_signs.findMany({
      where: { patient_id: patientId },
      orderBy: { recorded_at: 'desc' },
    });
  }

  /**
   * Auto-flag out-of-range vital signs
   */
  private checkVitalAbnormalities(dto: CreateVitalsDto): boolean {
    if (dto.systolic_bp && (dto.systolic_bp > 140 || dto.systolic_bp < 90))
      return true;
    if (dto.diastolic_bp && (dto.diastolic_bp > 90 || dto.diastolic_bp < 60))
      return true;
    if (dto.pulse_bpm && (dto.pulse_bpm > 100 || dto.pulse_bpm < 60))
      return true;
    if (
      dto.temperature_c &&
      (Number(dto.temperature_c) > 38.0 || Number(dto.temperature_c) < 36.0)
    )
      return true;
    if (dto.spo2_pct && dto.spo2_pct < 95) return true;
    if (
      dto.respiratory_rate &&
      (dto.respiratory_rate > 20 || dto.respiratory_rate < 12)
    )
      return true;
    return false;
  }

  // ============================================================
  // Diagnosis & ICD-10 (MB-004)
  // ============================================================

  /**
   * Search ICD-10 codes (MB-004)
   * Uses in-memory cache loaded from icd10_codes.json for fast search.
   */
  async searchIcd10Codes(query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    if (this.icd10Codes.length > 0) {
      const results = this.icd10Codes
        .filter(
          (entry) =>
            entry.code.toLowerCase().includes(lowerQuery) ||
            entry.desc.toLowerCase().includes(lowerQuery),
        )
        .slice(0, 20)
        .map((entry) => ({
          code: entry.code,
          description: entry.desc,
          category: null,
        }));

      return results;
    }

    const results = await this.prisma.icd10_codes.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 20,
      orderBy: { code: 'asc' },
    });

    return results;
  }

  /**
   * Create a diagnosis record (MB-004)
   */
  async createDiagnosis(
    patientId: string,
    doctorUserId: string,
    dto: CreateDiagnosisDto,
  ) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    // Verify ICD-10 code exists; if not, insert it as a custom entry
    let icd10 = await this.prisma.icd10_codes.findUnique({
      where: { code: dto.icd10_code },
    });

    if (!icd10) {
      icd10 = await this.prisma.icd10_codes.create({
        data: {
          code: dto.icd10_code,
          description: dto.preliminary_diagnosis,
        },
      });
    }

    const diagnosis = await this.prisma.patient_diagnoses.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorUserId,
        icd10_code: dto.icd10_code,
        chief_complaint: dto.chief_complaint,
        history_of_present_illness: dto.history_of_present_illness,
        review_of_systems: dto.review_of_systems,
        examination_findings: dto.examination_findings,
        preliminary_diagnosis: dto.preliminary_diagnosis,
        is_primary: dto.is_primary ?? false,
      },
      include: { icd10: true },
    });

    // Log to referral chain
    await this.addReferralChainEvent(
      patientId,
      'DIAGNOSIS',
      diagnosis.id,
      `Diagnosis: ${dto.preliminary_diagnosis}`,
      'MBBS_DOCTOR',
      `ICD-10: ${dto.icd10_code} | ${dto.chief_complaint ?? ''}`,
    );

    return diagnosis;
  }

  /**
   * Get diagnosis history for a patient
   */
  async getDiagnosisHistory(patientId: string) {
    return await this.prisma.patient_diagnoses.findMany({
      where: { patient_id: patientId },
      orderBy: { diagnosed_at: 'desc' },
      include: { icd10: true },
    });
  }

  // ============================================================
  // Diagnostic Test Ordering (MB-005, MB-006)
  // ============================================================

  /**
   * Get the diagnostic test catalog (MB-005)
   */
  async getTestCatalog(category?: string) {
    const where = category
      ? { category, is_active: true }
      : { is_active: true };
    return await this.prisma.diagnostic_test_catalog.findMany({
      where,
      orderBy: { category: 'asc' },
    });
  }

  /**
   * Order diagnostic tests for a patient (MB-005)
   */
  async orderTests(
    patientId: string,
    doctorUserId: string,
    dto: CreateTestOrderDto,
  ) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    // Verify all test IDs exist
    const tests = await this.prisma.diagnostic_test_catalog.findMany({
      where: { id: { in: dto.test_ids } },
    });

    if (tests.length !== dto.test_ids.length) {
      throw new BadRequestException('One or more test IDs are invalid.');
    }

    // Create orders for each test
    const orders = await Promise.all(
      dto.test_ids.map((testId) =>
        this.prisma.diagnostic_test_orders.create({
          data: {
            patient_id: patientId,
            doctor_id: doctorUserId,
            test_id: testId,
            clinical_notes: dto.clinical_notes,
            status: 'ORDERED',
          },
          include: { test: true },
        }),
      ),
    );

    // Log to referral chain
    await this.addReferralChainEvent(
      patientId,
      'TEST_ORDER',
      orders.map((o) => o.id).join(','),
      `Tests Ordered (${tests.length})`,
      'MBBS_DOCTOR',
      tests.map((t) => t.test_name).join('; '),
    );

    // TODO: Integrate with Notification Engine (Module 3.13) for lab team notification (MB-007)
    // TODO: The lab team notification (SMS/WhatsApp) should be triggered here
    // once the Notification Engine module is built.

    return {
      orders,
      requisition_slip: this.generateRequisitionData(patient, orders, tests),
    };
  }

  /**
   * Generate lab requisition slip data (MB-006)
   */
  private generateRequisitionData(
    patient: { first_name_en: string; last_name_en: string; mrn: string },
    orders: { id: string }[],
    tests: { test_name: string; test_code: string; category: string }[],
  ) {
    return {
      patient_name: `${patient.first_name_en} ${patient.last_name_en}`,
      mrn: patient.mrn,
      date: new Date().toISOString(),
      tests: tests.map((t) => ({
        name: t.test_name,
        code: t.test_code,
        category: t.category,
      })),
      // TODO: Add barcode/QR code generation when printing module is built
      barcode: `REQ-${patient.mrn}-${Date.now()}`,
    };
  }

  /**
   * Get test orders for a patient (MB-005)
   */
  async getTestOrders(patientId: string) {
    return await this.prisma.diagnostic_test_orders.findMany({
      where: { patient_id: patientId },
      orderBy: { ordered_at: 'desc' },
      include: {
        test: true,
        results: true,
      },
    });
  }

  // ============================================================
  // Test Results (MB-008)
  // ============================================================

  /**
   * Get test results for a patient (MB-008)
   */
  async getTestResults(patientId: string) {
    const orders = await this.prisma.diagnostic_test_orders.findMany({
      where: {
        patient_id: patientId,
        status: { in: ['COMPLETED', 'IN_PROGRESS'] },
      },
      orderBy: { ordered_at: 'desc' },
      include: {
        test: true,
        results: {
          orderBy: { resulted_at: 'desc' },
        },
      },
    });

    return orders.map((order) => ({
      ...order,
      has_critical: order.results.some((r) => r.is_critical),
      has_abnormal: order.results.some((r) => r.is_abnormal),
    }));
  }

  // ============================================================
  // Specialist Referral (MB-009)
  // ============================================================

  /**
   * Create a specialist referral (MB-009)
   */
  async createReferral(
    patientId: string,
    doctorUserId: string,
    dto: CreateReferralDto,
  ) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    // Validate specialty code
    const validSpecialties = [
      'CARDIOLOGY',
      'PULMONOLOGY',
      'NEUROLOGY',
      'NEPHROLOGY',
      'GASTROENTEROLOGY',
      'ENDOCRINOLOGY',
      'RHEUMATOLOGY',
      'DERMATOLOGY',
      'PSYCHIATRY',
      'ONCOLOGY',
      'ORTHOPEDICS',
    ];

    if (!validSpecialties.includes(dto.specialty_code)) {
      throw new BadRequestException(
        `Invalid specialty code. Valid codes: ${validSpecialties.join(', ')}`,
      );
    }

    // TODO: Integrate with Scheduling & Dispatch Module (Module 3.10)
    // to check specialist availability by area and date before creating referral.

    const referral = await this.prisma.specialist_referrals.create({
      data: {
        patient_id: patientId,
        referring_doctor_id: doctorUserId,
        specialty_code: dto.specialty_code,
        referral_reason: dto.referral_reason,
        clinical_summary: dto.clinical_summary,
        is_emergency: dto.is_emergency ?? false,
        status: 'PENDING',
      },
    });

    // Log to referral chain
    await this.addReferralChainEvent(
      patientId,
      'REFERRAL',
      referral.id,
      `Referred to ${dto.specialty_code}`,
      'MBBS_DOCTOR',
      dto.referral_reason + (dto.is_emergency ? ' 🚨 EMERGENCY' : ''),
    );

    // TODO: Integrate with Notification Engine (Module 3.13) for specialist alert
    // and with Scheduling & Dispatch Module (Module 3.10) for auto-appointment.

    return referral;
  }

  /**
   * Get referral history for a patient (MB-009)
   */
  async getReferralHistory(patientId: string) {
    return await this.prisma.specialist_referrals.findMany({
      where: { patient_id: patientId },
      orderBy: { created_at: 'desc' },
    });
  }

  // ============================================================
  // Referral Chain Tracking (MB-010)
  // ============================================================

  /**
   * Add an event to the referral chain
   */
  private async addReferralChainEvent(
    patientId: string,
    stepType: string,
    stepId: string,
    stepLabel: string,
    actorRole: string,
    notes?: string,
  ) {
    return await this.prisma.referral_chain.create({
      data: {
        patient_id: patientId,
        step_type: stepType,
        step_id: stepId,
        step_label: stepLabel,
        actor_role: actorRole,
        notes,
      },
    });
  }

  /**
   * Get the complete referral chain for a patient (MB-010)
   */
  async getReferralChain(patientId: string) {
    return await this.prisma.referral_chain.findMany({
      where: { patient_id: patientId },
      orderBy: { created_at: 'asc' },
    });
  }

  // ============================================================
  // Prescription Generation (MB-011, MB-012)
  // ============================================================

  /**
   * Generate a digital prescription (MB-011)
   */
  async createPrescription(
    patientId: string,
    doctorUserId: string,
    dto: CreatePrescriptionDto,
  ) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    // Get doctor's digital signature URL (MB-012)
    const doctor = await this.prisma.mbbs_doctor_profiles.findUnique({
      where: { user_id: doctorUserId },
      select: { signature_url: true, bmdc_registration: true },
    });

    if (!doctor) throw new ForbiddenException('Doctor profile not found.');

    const prescription = await this.prisma.prescriptions.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorUserId,
        diagnosis_id: dto.diagnosis_id,
        notes: dto.notes,
        digital_signature_url: doctor.signature_url,
        status: 'ACTIVE',
        medications: {
          create: dto.medications.map((med) => ({
            generic_name: med.generic_name,
            brand_name: med.brand_name,
            dosage: med.dosage,
            frequency: med.frequency,
            duration_days: med.duration_days,
            route: med.route,
            special_instructions: med.special_instructions,
          })),
        },
      },
      include: { medications: true },
    });

    // Log to referral chain
    await this.addReferralChainEvent(
      patientId,
      'PRESCRIPTION',
      prescription.id,
      `Prescription Issued (${dto.medications.length} medications)`,
      'MBBS_DOCTOR',
      dto.medications.map((m) => m.generic_name).join('; '),
    );

    // TODO: Integrate with Notification Engine (Module 3.13) to send
    // the prescription PDF to the patient via SMS/WhatsApp.

    return {
      prescription,
      doctor_bmdc: doctor.bmdc_registration,
      digital_signature_applied: !!doctor.signature_url,
    };
  }

  /**
   * Get prescription history for a patient
   */
  async getPrescriptionHistory(patientId: string) {
    return await this.prisma.prescriptions.findMany({
      where: { patient_id: patientId },
      orderBy: { issued_at: 'desc' },
      include: { medications: true },
    });
  }

  // ============================================================
  // Emergency Flag (MB-014)
  // ============================================================

  /**
   * Set emergency flag on a patient (MB-014)
   */
  async setEmergencyFlag(
    patientId: string,
    doctorUserId: string,
    dto: CreateEmergencyFlagDto,
  ) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    // Create the emergency flag
    const flag = await this.prisma.emergency_flags.create({
      data: {
        patient_id: patientId,
        flagged_by: doctorUserId,
        reason: dto.reason,
        is_active: true,
      },
    });

    // Update patient's emergency flag status
    await this.prisma.patients.update({
      where: { id: patientId },
      data: { has_emergency_flag: true, updated_at: new Date() },
    });

    // Log to referral chain with high-visibility marker
    await this.addReferralChainEvent(
      patientId,
      'EMERGENCY_FLAG',
      flag.id,
      '🚨 EMERGENCY FLAG RAISED',
      'MBBS_DOCTOR',
      dto.reason ?? 'Emergency flag activated by attending MBBS doctor',
    );

    // TODO: Integrate with Notification Engine (Module 3.13) for:
    // - Priority admin alert
    // - Specialist dispatch notification
    // - SMS alerts to emergency contacts

    return {
      flag,
      message:
        'Emergency flag has been set. All relevant teams have been notified.',
      // TODO: The admin_notified and specialist_dispatched fields will be
      // populated once the Notification Engine and Scheduling modules are built.
      admin_notified: 'TODO: Notification Engine (Module 3.13)',
      specialist_dispatched: 'TODO: Scheduling & Dispatch Module (Module 3.10)',
    };
  }

  /**
   * Get emergency flags for a patient
   */
  async getEmergencyFlags(patientId: string) {
    return await this.prisma.emergency_flags.findMany({
      where: { patient_id: patientId },
      orderBy: { created_at: 'desc' },
    });
  }

  // ============================================================
  // Digital Signature
  // ============================================================

  /**
   * Get the digital signature URL for the logged-in MBBS doctor.
   */
  async getSignature(doctorUserId: string) {
    const doctor = await this.prisma.mbbs_doctor_profiles.findUnique({
      where: { user_id: doctorUserId },
      select: { signature_url: true },
    });
    return { signature_url: doctor?.signature_url ?? null };
  }

  /**
   * Update the digital signature URL for the logged-in MBBS doctor.
   */
  async updateSignature(doctorUserId: string, signatureUrl: string) {
    const doctor = await this.prisma.mbbs_doctor_profiles.findUnique({
      where: { user_id: doctorUserId },
    });
    if (!doctor) {
      throw new ForbiddenException('MBBS doctor profile not found.');
    }

    return this.prisma.mbbs_doctor_profiles.update({
      where: { user_id: doctorUserId },
      data: { signature_url: signatureUrl },
    });
  }

  // ============================================================
  // Doctor Profile
  // ============================================================

  /**
   * Get the logged-in MBBS doctor's full profile info.
   */
  async getDoctorProfile(doctorUserId: string) {
    const doctor = await this.prisma.mbbs_doctor_profiles.findUnique({
      where: { user_id: doctorUserId },
      include: {
        user: {
          select: { firstNameEn: true, lastNameEn: true },
        },
      },
    });
    if (!doctor) {
      throw new ForbiddenException('MBBS doctor profile not found.');
    }
    return {
      first_name_en: doctor.user.firstNameEn,
      last_name_en: doctor.user.lastNameEn,
      bmdc_registration: doctor.bmdc_registration,
      specialization: doctor.specialization,
      qualification: doctor.qualification,
      signature_url: doctor.signature_url,
    };
  }

  // ============================================================
  // Doctor Schedule (Helper)
  // ============================================================

  /**
   * Get the MBBS doctor's schedule/assignments
   */
  async getDoctorSchedule(doctorUserId: string) {
    // TODO: Integrate with Scheduling & Dispatch Module (Module 3.10)
    // for actual appointment schedule data.
    // For now, return recent vital signs as a proxy for "appointments"

    return await this.prisma.patient_vital_signs.findMany({
      where: { doctor_id: doctorUserId },
      orderBy: { recorded_at: 'desc' },
      take: 20,
      include: { patient: true },
    });
  }

  // ============================================================
  // Differential Diagnosis (MB-013) — Stub
  // ============================================================

  // ============================================================
  // Patient Documents
  // ============================================================

  /**
   * Upload a patient document to UploadCare CDN (no local storage)
   */
  async uploadDocument(patientId: string, file: Express.Multer.File) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    const cdnBase = process.env.UPLOADCARE_CDN_BASE || 'https://ucarecdn.com';

    const formData = new FormData();
    formData.append('UPLOADCARE_PUB_KEY', process.env.UPLOADCARE_PUB_KEY!);
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });
    formData.append('file', blob, file.originalname);

    const ucRes = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: formData,
    });

    if (!ucRes.ok) {
      const body = await ucRes.text().catch(() => '');
      throw new BadRequestException(
        `UploadCare upload failed: ${ucRes.status} ${body}`,
      );
    }

    const ucData = (await ucRes.json()) as { file: string };
    const fileUrl = `${cdnBase}/${ucData.file}/${file.originalname}`;

    const document = await this.prisma.patient_documents.create({
      data: {
        patient_id: patientId,
        file_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        file_url: fileUrl,
      },
    });

    await this.addReferralChainEvent(
      patientId,
      'DOCUMENT_UPLOAD',
      document.id,
      `Document Uploaded: ${file.originalname}`,
      'PATIENT',
      `Type: ${file.mimetype}, Size: ${(file.size / 1024).toFixed(1)} KB`,
    );

    return document;
  }

  /**
   * Extract text on-demand — fetches file from UploadCare CDN
   */
  async extractDocumentText(
    docId: string,
    patientId: string,
  ): Promise<string | null> {
    const document = await this.prisma.patient_documents.findFirst({
      where: { id: docId, patient_id: patientId },
    });
    if (!document) throw new NotFoundException('Document not found.');

    const fileUrl = document.file_url;
    const mimeType = document.file_type;

    const res = await fetch(fileUrl);
    if (!res.ok) return '[Failed to fetch document]';
    const buffer = Buffer.from(await res.arrayBuffer());

    if (mimeType === 'application/pdf') {
      try {
        const data = await pdfParse(buffer);
        return this.formatText(data.text || '[No text found in PDF]');
      } catch {
        return '[Text extraction failed for this PDF]';
      }
    }

    if (
      mimeType === 'application/msword' ||
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return this.formatText(result.value || '[No text found in document]');
      } catch {
        return '[Text extraction failed for this document]';
      }
    }

    if (mimeType.startsWith('image/')) {
      try {
        const processed = await sharp(buffer)
          .grayscale()
          .resize({ width: 2400, withoutEnlargement: false })
          .sharpen()
          .normalise()
          .png()
          .toBuffer();
        const { data } = await Tesseract.recognize(processed, 'eng', {
          logger: () => {},
        });
        const raw = data.text?.trim();
        return raw ? this.formatText(raw) : '[No text found in image]';
      } catch {
        return '[OCR failed for this image]';
      }
    }

    return `[Text extraction not supported for ${mimeType}]`;
  }

  private formatText(text: string): string {
    if (text.startsWith('[')) return text;

    // Split concatenated fields
    const cleaned = text
      .replace(/([a-z])([A-Z][a-z]+ [A-Z][a-z]+:)/g, '$1\n$2') // "nDate Collected:" → "n\nDate Collected:"
      .replace(/([a-z])([A-Z][a-z]+:)/g, '$1\n$2') // "eOrdering MD:" → "e\nOrdering MD:"
      .replace(/(\d)([A-Z][a-z]+ [A-Za-z]+:)/g, '$1\n$2') // "2Ordering MD:" → "2\nOrdering MD:"
      .replace(/(\d{2}-\w{3}-\d{4})([A-Z])/g, '$1\n$2') // "26-Jun-2026P" → "26-Jun-2026\nP"
      .replace(/(\d{2}-\w{3}-\d{4})\s*([A-Z][a-z]+:)/g, '$1\n$2'); // date then field

    const lines = cleaned
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l.length > 0);

    const result: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prev = i > 0 ? lines[i - 1] : '';

      // Insert blank line before section headers
      const isSectionHeader =
        /^[A-Z][A-Z\s()]+$/.test(line) || /^[A-Z][A-Za-z\s]+:$/.test(line);
      if (
        isSectionHeader &&
        prev.length > 0 &&
        !prev.endsWith(':') &&
        prev !== ''
      ) {
        result.push('');
      }

      // Insert blank line before lab result lines
      const isResultLine = /^[A-Za-z][A-Za-z\s(%)]+[\d]+\.[\d]/.test(line);
      if (
        isResultLine &&
        prev.length > 0 &&
        !prev.endsWith(':') &&
        !/^[A-Z][A-Z\s]+$/.test(prev)
      ) {
        result.push('');
      }

      // Add spaces in concatenated result lines: "WBC)11.8HIGH4.5" → "WBC)  11.8  HIGH  4.5"
      const formatted = line
        .replace(/([\d.]+)(HIGH|LOW|NORMAL|CRITICAL)/g, '$1  $2')
        .replace(
          /(HIGH|LOW|NORMAL|CRITICAL)(\s*[\d.]+\s*-\s*[\d.]+)/g,
          '$1  $2',
        )
        .replace(/([\d.]+\s*-\s*[\d.]+)([a-zA-Z])/g, '$1  $2');

      result.push(formatted);
    }

    return result.join('\n');
  }

  /**
   * Get all documents for a patient
   */
  async getPatientDocuments(patientId: string) {
    return await this.prisma.patient_documents.findMany({
      where: { patient_id: patientId },
      orderBy: { uploaded_at: 'desc' },
    });
  }

  /**
   * Get a specific document details
   */
  async getDocumentDetails(patientId: string, docId: string) {
    const document = await this.prisma.patient_documents.findFirst({
      where: { id: docId, patient_id: patientId },
    });
    if (!document) throw new NotFoundException('Document not found.');
    return document;
  }

  // ============================================================
  // Differential Diagnosis (MB-013) — Stub
  // ============================================================

  /**
   * Get differential diagnosis suggestions (MB-013)
   * STUB: AI Engine not yet built
   */
  async getDifferentialDiagnosis(patientId: string) {
    // Get latest vital signs
    const latestVitals = await this.prisma.patient_vital_signs.findFirst({
      where: { patient_id: patientId },
      orderBy: { recorded_at: 'desc' },
    });

    // TODO: Integrate with AI Engine for differential diagnosis suggestions (MB-013)
    // The AI engine will analyze symptom inputs + vital signs to produce a ranked
    // differential diagnosis list. For now, return a stub message.

    return {
      message: 'AI Differential Diagnosis Engine is not yet integrated.',
      vital_signs_available: !!latestVitals,
      // TODO: Replace with actual AI engine call
      suggestions: [],
    };
  }
}
