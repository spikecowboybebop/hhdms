import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { VisitGateway } from './visit.gateway';
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
    private readonly visitGateway: VisitGateway,
  ) {}

  onModuleInit() {
    const candidates = [
      path.resolve(__dirname, '../../../../../icd10_codes.json'),
      path.resolve(process.cwd(), '../../icd10_codes.json'),
    ];
    for (const jsonPath of candidates) {
      try {
        const raw = fs.readFileSync(jsonPath, 'utf-8');
        this.icd10Codes = JSON.parse(raw);
        console.log(
          `Loaded ${this.icd10Codes.length} ICD-10 codes from ${jsonPath}`,
        );
        return;
      } catch {
        /* try next */
      }
    }
    console.warn(
      'Could not load icd10_codes.json. cwd=' +
        process.cwd() +
        ' dirname=' +
        __dirname,
    );
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
      .map((a) => ({
        ...a.patient,
        appointment_activity: a.appointment_activity,
        patient_consent: a.patient_consent,
      }))
      .sort(
        (a: any, b: any) =>
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
   * that the doctor is on their way, updates appointment_activity to
   * 'arriving', and emits a real-time event to the doctor's web portal.
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
      { type: 'doctor_coming', patient_id: patientId },
    );

    // Update appointment activity
    await this.prisma.doctor_patient_assignments.updateMany({
      where: { doctor_id: doctorUserId, patient_id: patientId },
      data: { appointment_activity: 'arriving' },
    });

    // Emit real-time event to the doctor's web portal
    this.visitGateway.emitVisitStateChanged(
      doctorUserId,
      patientId,
      'arriving',
    );

    return { message: 'Visit started', doctor_name: doctorName };
  }

  /**
   * Mark a patient visit as arrived — updates appointment_activity to
   * 'arrived' and emits a real-time event.
   * Called by the patient's device after the doctor tracking animation completes.
   */
  async markArrived(patientId: string) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    // Find the most recent active assignment for this patient
    const assignment = await this.prisma.doctor_patient_assignments.findFirst({
      where: { patient_id: patientId },
      orderBy: { assigned_at: 'desc' },
    });
    if (!assignment)
      throw new NotFoundException(
        'No doctor assignment found for this patient.',
      );

    await this.prisma.doctor_patient_assignments.update({
      where: { id: assignment.id },
      data: { appointment_activity: 'arrived' },
    });

    this.visitGateway.emitVisitStateChanged(
      assignment.doctor_id,
      patientId,
      'arrived',
    );

    return { message: 'Visit marked as arrived' };
  }

  /**
   * End a patient visit — sets appointment_activity to 'done'.
   */
  async endVisit(patientId: string) {
    const assignment = await this.prisma.doctor_patient_assignments.findFirst({
      where: { patient_id: patientId },
      orderBy: { assigned_at: 'desc' },
    });
    if (!assignment) throw new NotFoundException('No assignment found.');

    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
      select: { user_id: true },
    });

    await this.prisma.doctor_patient_assignments.update({
      where: { id: assignment.id },
      data: { appointment_activity: 'done' },
    });

    await this.prisma.booking_sessions.updateMany({
      where: { patient_id: patientId, status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    });

    if (patient?.user_id) {
      await this.notificationsService.sendToUser(
        patient.user_id,
        {
          title: 'Appointment Completed',
          body: 'Your appointment is completed. Please complete your payment.',
        },
        { type: 'appointment_done', patient_id: patientId },
      );
    }

    this.visitGateway.emitVisitStateChanged(
      assignment.doctor_id,
      patientId,
      'done',
    );

    return { message: 'Visit ended' };
  }

  /**
   * Request patient consent — sets patient_consent to 'pending' and
   * sends a push notification to the patient's device asking for consent.
   */
  async requestConsent(doctorUserId: string, patientId: string) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');
    if (!patient.user_id)
      throw new BadRequestException('Patient has no associated user account.');

    const assignment = await this.prisma.doctor_patient_assignments.findFirst({
      where: { doctor_id: doctorUserId, patient_id: patientId },
      orderBy: { assigned_at: 'desc' },
    });
    if (!assignment)
      throw new NotFoundException('No assignment found for this patient.');
    if (assignment.appointment_activity !== 'arrived')
      throw new BadRequestException(
        'Cannot request consent until the patient has arrived.',
      );

    // Allow re-asking if previously denied
    await this.prisma.doctor_patient_assignments.update({
      where: { id: assignment.id },
      data: { patient_consent: 'pending' },
    });

    await this.notificationsService.sendToUser(
      patient.user_id,
      {
        title: 'Consent Required',
        body: 'Your doctor is requesting your consent to begin the consultation.',
      },
      {
        type: 'consent_request',
        patient_id: patientId,
      },
    );

    this.visitGateway.emitVisitStateChanged(
      doctorUserId,
      patientId,
      'arrived',
      {
        patient_consent: 'pending',
      },
    );

    return { message: 'Consent request sent to patient' };
  }

  /**
   * Respond to a consent request — updates patient_consent to
   * 'granted' or 'denied' and notifies the web portal via Socket.IO.
   */
  async respondConsent(patientId: string, answer: 'granted' | 'denied') {
    const assignment = await this.prisma.doctor_patient_assignments.findFirst({
      where: { patient_id: patientId },
      orderBy: { assigned_at: 'desc' },
    });
    if (!assignment)
      throw new NotFoundException('No assignment found for this patient.');

    await this.prisma.doctor_patient_assignments.update({
      where: { id: assignment.id },
      data: { patient_consent: answer },
    });

    this.visitGateway.emitVisitStateChanged(
      assignment.doctor_id,
      patientId,
      'arrived',
      { patient_consent: answer },
    );

    return { message: `Consent ${answer}` };
  }

  /**
   * Ensure the patient's appointment_activity is 'arrived' AND
   * patient_consent is 'granted', meaning the doctor can begin
   * clinical consultation. Throws BadRequestException otherwise.
   */
  private async ensurePatientArrived(doctorUserId: string, patientId: string) {
    const assignment = await this.prisma.doctor_patient_assignments.findFirst({
      where: { doctor_id: doctorUserId, patient_id: patientId },
      orderBy: { assigned_at: 'desc' },
    });
    if (!assignment || assignment.appointment_activity !== 'arrived') {
      throw new BadRequestException(
        'Consultation cannot begin until the doctor has arrived at the patient location.',
      );
    }
    if (assignment.patient_consent !== 'granted') {
      throw new BadRequestException(
        'Consultation cannot begin until the patient has granted consent.',
      );
    }
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

    await this.ensurePatientArrived(doctorUserId, patientId);

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

    await this.ensurePatientArrived(doctorUserId, patientId);

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

    await this.ensurePatientArrived(doctorUserId, patientId);

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

    await this.ensurePatientArrived(doctorUserId, patientId);

    // Validate specialty code
    const validSpecialties = [
      'PULM',
      'CARD',
      'NEURO',
      'NEPH',
      'DERM',
      'ENT',
      'SURG',
      'GYNEC',
      'INTERN',
      'PAIN',
      'ONCO',
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
        specialist_id: dto.specialist_id ?? null,
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

    // Send notification to assigned specialist
    if (dto.specialist_id) {
      try {
        const doctorUser = await this.prisma.user.findUnique({
          where: { id: doctorUserId },
          select: { firstNameEn: true, lastNameEn: true },
        });
        const doctorName = doctorUser
          ? `Dr. ${doctorUser.firstNameEn} ${doctorUser.lastNameEn}`
          : 'A doctor';

        await this.notificationsService.sendToUser(
          dto.specialist_id,
          {
            title: `New Referral — ${patient.first_name_en} ${patient.last_name_en}`,
            body: `${doctorName} has referred ${patient.first_name_en} ${patient.last_name_en} for ${dto.specialty_code} consultation.`,
          },
          {
            type: 'new_referral',
            patient_id: patientId,
            referral_id: referral.id,
          },
        );
      } catch (err) {
        console.error(
          '[REFERRAL] Failed to send notification to specialist:',
          err,
        );
      }
    }

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

    await this.ensurePatientArrived(doctorUserId, patientId);

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

  // ============================================================
  // Clinical Report PDF Generation
  // ============================================================

  async generateClinicalReport(patientId: string, doctorUserId: string) {
    const patient = await this.prisma.patients.findUnique({
      where: { id: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    const doctorProfile = await this.prisma.mbbs_doctor_profiles.findUnique({
      where: { user_id: doctorUserId },
      include: { user: { select: { firstNameEn: true, lastNameEn: true } } },
    });
    if (!doctorProfile)
      throw new NotFoundException('Doctor profile not found.');

    // Fetch clinical data for this session (filtered by doctor_id)
    const [vitals, diagnoses, testOrders, prescriptions, referrals] =
      await Promise.all([
        this.prisma.patient_vital_signs.findMany({
          where: { patient_id: patientId, doctor_id: doctorUserId },
          orderBy: { recorded_at: 'desc' },
        }),
        this.prisma.patient_diagnoses.findMany({
          where: { patient_id: patientId, doctor_id: doctorUserId },
          orderBy: { diagnosed_at: 'desc' },
          include: { icd10: true },
        }),
        this.prisma.diagnostic_test_orders.findMany({
          where: { patient_id: patientId, doctor_id: doctorUserId },
          orderBy: { ordered_at: 'desc' },
          include: { test: true, results: true },
        }),
        this.prisma.prescriptions.findMany({
          where: { patient_id: patientId, doctor_id: doctorUserId },
          orderBy: { issued_at: 'desc' },
          include: { medications: true },
        }),
        this.prisma.specialist_referrals.findMany({
          where: { patient_id: patientId, referring_doctor_id: doctorUserId },
          orderBy: { created_at: 'desc' },
        }),
      ]);

    // Build report data snapshot as JSON
    const reportSnapshot = {
      patient: {
        mrn: patient.mrn,
        first_name_en: patient.first_name_en,
        last_name_en: patient.last_name_en,
        first_name_bn: patient.first_name_bn,
        last_name_bn: patient.last_name_bn,
        date_of_birth: patient.date_of_birth,
        sex: patient.sex,
        blood_group: patient.blood_group,
        phone_number: patient.phone_number,
      },
      doctor: {
        name: `${doctorProfile.user.firstNameEn} ${doctorProfile.user.lastNameEn}`,
        specialization: doctorProfile.specialization,
        bmdc: doctorProfile.bmdc_registration,
        signature_url: doctorProfile.signature_url,
      },
      vitals: vitals.map((v) => ({
        systolic_bp: v.systolic_bp,
        diastolic_bp: v.diastolic_bp,
        pulse_bpm: v.pulse_bpm,
        temperature_c: v.temperature_c?.toString(),
        spo2_pct: v.spo2_pct,
        respiratory_rate: v.respiratory_rate,
        weight_kg: v.weight_kg?.toString(),
        height_cm: v.height_cm?.toString(),
        bmi: v.bmi?.toString(),
        notes: v.notes,
        recorded_at: v.recorded_at,
      })),
      diagnoses: diagnoses.map((d) => ({
        icd10_code: d.icd10_code,
        icd10_description: d.icd10?.description || null,
        chief_complaint: d.chief_complaint,
        history_of_present_illness: d.history_of_present_illness,
        review_of_systems: d.review_of_systems,
        examination_findings: d.examination_findings,
        preliminary_diagnosis: d.preliminary_diagnosis,
        is_primary: d.is_primary,
        diagnosed_at: d.diagnosed_at,
      })),
      test_orders: testOrders.map((o) => ({
        test_name: o.test?.test_name || 'Unknown',
        test_code: o.test?.test_code || '',
        clinical_notes: o.clinical_notes,
        status: o.status,
        ordered_at: o.ordered_at,
        results: o.results.map((r) => ({
          result_value: r.result_value,
          result_numeric: r.result_numeric?.toString(),
          is_abnormal: r.is_abnormal,
          is_critical: r.is_critical,
          notes: r.notes,
        })),
      })),
      prescriptions: prescriptions.map((p) => ({
        notes: p.notes,
        status: p.status,
        issued_at: p.issued_at,
        medications: p.medications.map((m) => ({
          generic_name: m.generic_name,
          brand_name: m.brand_name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration_days: m.duration_days,
          route: m.route,
          special_instructions: m.special_instructions,
        })),
      })),
      referrals: referrals.map((r) => ({
        specialty_code: r.specialty_code,
        referral_reason: r.referral_reason,
        clinical_summary: r.clinical_summary,
        is_emergency: r.is_emergency,
        status: r.status,
        created_at: r.created_at,
      })),
    };

    // Generate PDF buffer
    const pdfBuffer = await this.generatePdfBuffer({
      patient,
      doctorProfile,
      vitals,
      diagnoses,
      testOrders,
      prescriptions,
      referrals,
    });

    // Upload to UploadCare
    const fileName = `clinical_report_${patient.mrn}_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.pdf`;

    const cdnBase = process.env.UPLOADCARE_CDN_BASE || 'https://ucarecdn.com';
    const formData = new FormData();
    formData.append('UPLOADCARE_PUB_KEY', process.env.UPLOADCARE_PUB_KEY!);
    const blob = new Blob([new Uint8Array(pdfBuffer)], {
      type: 'application/pdf',
    });
    formData.append('file', blob, fileName);

    const ucRes = await fetch('https://upload.uploadcare.com/base/', {
      method: 'POST',
      body: formData,
    });

    if (!ucRes.ok) {
      const body = await ucRes.text().catch(() => '');
      throw new BadRequestException(
        'UploadCare upload failed: ' + ucRes.status + ' ' + body,
      );
    }

    const ucData = (await ucRes.json()) as { file: string };
    const fileUrl = `${cdnBase}/${ucData.file}/${fileName}`;

    // Save to patient_diagnosis_reports
    const report = await this.prisma.patient_diagnosis_reports.create({
      data: {
        patient_id: patientId,
        doctor_id: doctorUserId,
        report_type: 'CLINICAL_CONSULTATION',
        report_data: reportSnapshot,
        file_url: fileUrl,
        file_name: fileName,
        file_size: pdfBuffer.length,
      },
    });

    // ── Send push notification to patient if they have a user account ──
    if (patient.user_id) {
      const doctorName = `${doctorProfile.user.firstNameEn} ${doctorProfile.user.lastNameEn}`;
      this.notificationsService
        .sendToUser(
          patient.user_id,
          {
            title: 'Clinical Report Ready',
            body: `Your clinical consultation report from Dr. ${doctorName} has been generated.`,
          },
          {
            type: 'report_generated',
            patient_id: patientId,
            report_id: report.id,
          },
        )
        .catch((err) =>
          console.error(
            '[REPORT] Failed to send notification to patient:',
            err,
          ),
        );
    }

    return report;
  }

  private async generatePdfBuffer(data: {
    patient: any;
    doctorProfile: any;
    vitals: any[];
    diagnoses: any[];
    testOrders: any[];
    prescriptions: any[];
    referrals: any[];
  }): Promise<Buffer> {
    const { default: PDFDocument } = await import('pdfkit');
    const doc = new PDFDocument({ margin: 48, size: 'A4' });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const p = data.patient;
    const dp = data.doctorProfile;
    const doctorName = dp.user.firstNameEn + ' ' + dp.user.lastNameEn;

    const PAGE_WIDTH = 496;
    const MARGIN = 48;
    const PAGE_BOTTOM = 770;
    const COLUMN_WIDTHS = {
      full: PAGE_WIDTH,
      half: (PAGE_WIDTH - 24) / 2,
      third: (PAGE_WIDTH - 48) / 3,
    };

    const brandNavy = '#0A2647';
    const brandTeal = '#0D9488';
    const textDark = '#1e293b';
    const textMedium = '#475569';
    const textLight = '#94a3b8';
    const bgLight = '#F8FAFC';
    const bgTableHeader = '#1e293b';
    const borderLight = '#E2E8F0';
    const rowAlt = '#F1F5F9';

    let pageNum = 1;

    // ── Footer handler with page numbers ──────────────────────
    doc.on('pageAdded', () => {
      pageNum++;
      drawFooter();
    });

    function drawFooter() {
      const y = 775;
      doc
        .strokeColor(borderLight)
        .lineWidth(0.5)
        .moveTo(MARGIN, y)
        .lineTo(MARGIN + PAGE_WIDTH, y)
        .stroke();
      doc
        .fillColor(textLight)
        .fontSize(7)
        .font('Helvetica')
        .text(
          'Aastha Tele-Healthcare | Clinical Consultation Report',
          MARGIN,
          y + 5,
          { align: 'left' },
        );
      doc.text('Page ' + pageNum, MARGIN + PAGE_WIDTH, y + 5, {
        align: 'right',
        width: 0,
      });
    }

    // ── Helper: section header with accent bar ────────────────
    function sectionHeader(number: string, title: string) {
      const label = number + '.  ' + title;
      // Draw the section header label in full-width box
      doc.moveDown(0.5);
      const y = doc.y;
      doc.rect(MARGIN, y, PAGE_WIDTH, 24).fill('#F1F5F9');
      doc
        .fillColor(brandNavy)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(label, MARGIN + 6, y + 5, { width: PAGE_WIDTH - 12 });
      doc.moveDown(0.8);
    }

    // ── Helper: styled info table ──────────────────────────────
    function drawInfoRow(
      label: string,
      value: string,
      x: number,
      y: number,
      w: number,
    ) {
      doc
        .fillColor(textMedium)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(label, x, y, { width: w * 0.35, align: 'left' });
      doc
        .fillColor(textDark)
        .fontSize(9)
        .font('Helvetica')
        .text(value || '\u2014', x + w * 0.35, y, {
          width: w * 0.6,
          align: 'left',
        });
    }

    // ── Helper: professional table ─────────────────────────────
    function drawTable(
      headers: { label: string; w: number; align?: string }[],
      rows: { text: string; align?: string }[][],
      startY: number,
    ): number {
      const rowH = 20;
      const headerH = 22;
      const colStartX = MARGIN;

      // Calculate column X positions
      const colXs: number[] = [];
      let cx = colStartX;
      for (const h of headers) {
        colXs.push(cx);
        cx += h.w;
      }

      // Check if we need a new page
      if (startY + headerH + rowH > PAGE_BOTTOM) {
        doc.addPage();
        startY = MARGIN;
      }

      // Draw header row
      doc.rect(colStartX, startY, PAGE_WIDTH, headerH).fill(bgTableHeader);
      for (let i = 0; i < headers.length; i++) {
        doc
          .fillColor('#FFFFFF')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(headers[i].label, colXs[i] + 4, startY + 5, {
            width: headers[i].w - 8,
            align: (headers[i].align as any) || 'left',
          });
      }

      let currentY = startY + headerH;

      // Draw data rows
      for (let r = 0; r < rows.length; r++) {
        if (currentY + rowH > PAGE_BOTTOM) {
          doc.addPage();
          currentY = MARGIN;
          // Redraw header on new page
          doc
            .rect(colStartX, currentY, PAGE_WIDTH, headerH)
            .fill(bgTableHeader);
          for (let i = 0; i < headers.length; i++) {
            doc
              .fillColor('#FFFFFF')
              .fontSize(8)
              .font('Helvetica-Bold')
              .text(headers[i].label, colXs[i] + 4, currentY + 5, {
                width: headers[i].w - 8,
                align: (headers[i].align as any) || 'left',
              });
          }
          currentY += headerH;
        }

        // Alternating row background
        if (r % 2 === 0) {
          doc.rect(colStartX, currentY, PAGE_WIDTH, rowH).fill(rowAlt);
        }

        // Row border lines
        doc
          .strokeColor(borderLight)
          .lineWidth(0.5)
          .moveTo(colStartX, currentY)
          .lineTo(colStartX + PAGE_WIDTH, currentY)
          .stroke();

        for (let i = 0; i < rows[r].length; i++) {
          doc
            .fillColor(textDark)
            .fontSize(7.5)
            .font('Helvetica')
            .text(rows[r][i].text || '\u2014', colXs[i] + 4, currentY + 5, {
              width: headers[i].w - 8,
              align:
                (rows[r][i].align as any) ||
                (headers[i].align as any) ||
                'left',
            });
        }
        currentY += rowH;
      }

      // Bottom border
      doc
        .strokeColor(borderLight)
        .lineWidth(0.5)
        .moveTo(colStartX, currentY)
        .lineTo(colStartX + PAGE_WIDTH, currentY)
        .stroke();

      return currentY;
    }

    // ═══════════════════════════════════════════════════════════
    //  HEADER AREA — Brand bar + Title
    // ═══════════════════════════════════════════════════════════

    // Top brand bar
    doc.rect(0, 0, 595, 8).fill(brandNavy);

    // Brand name
    doc
      .fillColor(brandNavy)
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('AASTHA TELE-HEALTHCARE', MARGIN, 28, { align: 'center' });

    // Tagline
    doc
      .fillColor(brandTeal)
      .fontSize(9)
      .font('Helvetica')
      .text('Clinical Consultation Report', { align: 'center' });

    // Separator
    doc
      .strokeColor(brandTeal)
      .lineWidth(1.5)
      .moveTo(MARGIN + 100, doc.y + 4)
      .lineTo(MARGIN + PAGE_WIDTH - 100, doc.y + 4)
      .stroke();
    doc.moveDown(1.5);

    // Report metadata
    const reportDate = new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Dhaka',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const reportId =
      'CR-' +
      new Date().toISOString().slice(0, 10).replace(/-/g, '') +
      '-' +
      String(Date.now()).slice(-6);

    doc.fillColor(textMedium).fontSize(8).font('Helvetica');
    const metaY = doc.y;
    doc.text('Report ID: ' + reportId, MARGIN, metaY, {
      width: PAGE_WIDTH,
      align: 'left',
    });
    doc.text('Date: ' + reportDate + ' BST', MARGIN, metaY, {
      width: PAGE_WIDTH,
      align: 'right',
    });
    doc.moveDown(1);

    // ═══════════════════════════════════════════════════════════
    //  SECTION 1 — Patient & Doctor Information
    // ═══════════════════════════════════════════════════════════

    // Patient Info Card
    const ageStr = p.date_of_birth
      ? Math.floor(
          (Date.now() - new Date(p.date_of_birth).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        ) + ' yrs'
      : '\u2014';
    const nameDisplay = p.first_name_en + ' ' + (p.last_name_en || '');
    const dobStr = p.date_of_birth
      ? new Date(p.date_of_birth).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '\u2014';

    const infoCardY = doc.y;
    doc
      .rect(MARGIN, infoCardY, PAGE_WIDTH, 72)
      .fill(bgLight)
      .strokeColor(borderLight)
      .lineWidth(0.5)
      .stroke();

    doc
      .fillColor(brandNavy)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('PATIENT INFORMATION', MARGIN + 8, infoCardY + 6);

    const iiY = infoCardY + 22;
    const colW = (PAGE_WIDTH - 32) / 2;
    drawInfoRow('Name:', nameDisplay, MARGIN + 8, iiY, colW);
    drawInfoRow('MRN:', p.mrn, MARGIN + 8, iiY + 12, colW);
    drawInfoRow('DOB:', dobStr, MARGIN + 8, iiY + 24, colW);

    drawInfoRow(
      'Sex:',
      p.sex === 'M' ? 'Male' : 'Female',
      MARGIN + 8 + colW,
      iiY,
      colW,
    );
    drawInfoRow('Age:', ageStr, MARGIN + 8 + colW, iiY + 12, colW);
    drawInfoRow(
      'Blood Group:',
      p.blood_group || '\u2014',
      MARGIN + 8 + colW,
      iiY + 24,
      colW,
    );

    doc.y = infoCardY + 76;
    doc.moveDown(0.5);

    // Doctor Info Card
    const docCardY = doc.y;
    doc
      .rect(MARGIN, docCardY, PAGE_WIDTH, 50)
      .fill(bgLight)
      .strokeColor(borderLight)
      .lineWidth(0.5)
      .stroke();

    doc
      .fillColor(brandNavy)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('ATTENDING DOCTOR', MARGIN + 8, docCardY + 6);

    const diY = docCardY + 22;
    drawInfoRow('Name:', 'Dr. ' + doctorName, MARGIN + 8, diY, colW);
    drawInfoRow(
      'Specialization:',
      dp.specialization || '\u2014',
      MARGIN + 8,
      diY + 12,
      colW,
    );
    drawInfoRow(
      'BMDC:',
      dp.bmdc_registration || '\u2014',
      MARGIN + 8 + colW,
      diY,
      colW,
    );

    doc.y = docCardY + 55;

    // ═══════════════════════════════════════════════════════════
    //  SECTION 2 — Vital Signs
    // ═══════════════════════════════════════════════════════════
    if (data.vitals.length > 0) {
      sectionHeader('01', 'VITAL SIGNS');

      const vHeaders = [
        { label: 'Date/Time', w: 90 },
        { label: 'BP (mmHg)', w: 60 },
        { label: 'Pulse', w: 42 },
        { label: 'Temp (' + String.fromCharCode(176) + 'C)', w: 48 },
        { label: 'SpO2 (%)', w: 44 },
        { label: 'RR', w: 32 },
        { label: 'Wt (kg)', w: 40 },
        { label: 'Ht (cm)', w: 40 },
        { label: 'BMI', w: 36 },
        { label: 'Notes', w: 64 },
      ];

      const vRows = data.vitals.map((v: any) => [
        {
          text: v.recorded_at
            ? new Date(v.recorded_at).toLocaleString('en-GB').slice(0, 13)
            : '\u2014',
        },
        {
          text:
            v.systolic_bp && v.diastolic_bp
              ? String(v.systolic_bp) + '/' + String(v.diastolic_bp)
              : '\u2014',
          align: 'center',
        },
        {
          text: v.pulse_bpm != null ? String(v.pulse_bpm) : '\u2014',
          align: 'center',
        },
        {
          text: v.temperature_c != null ? String(v.temperature_c) : '\u2014',
          align: 'center',
        },
        {
          text: v.spo2_pct != null ? String(v.spo2_pct) : '\u2014',
          align: 'center',
        },
        {
          text:
            v.respiratory_rate != null ? String(v.respiratory_rate) : '\u2014',
          align: 'center',
        },
        {
          text: v.weight_kg != null ? String(v.weight_kg) : '\u2014',
          align: 'center',
        },
        {
          text: v.height_cm != null ? String(v.height_cm) : '\u2014',
          align: 'center',
        },
        {
          text: v.bmi != null ? String(v.bmi) : '\u2014',
          align: 'center',
        },
        { text: v.notes ? v.notes.slice(0, 18) : '' },
      ]);

      const vy = drawTable(vHeaders, vRows, doc.y);
      doc.y = vy + 4;
    }

    // ═══════════════════════════════════════════════════════════
    //  SECTION 3 — Diagnosis
    // ═══════════════════════════════════════════════════════════
    if (data.diagnoses.length > 0) {
      sectionHeader('02', 'DIAGNOSIS');

      const dHeaders = [
        { label: 'ICD-10', w: 50 },
        { label: 'Description', w: 80 },
        { label: 'Preliminary Diagnosis', w: 114 },
        { label: 'Chief Complaint', w: 100 },
        { label: 'Exam Findings', w: 100 },
        { label: 'Primary', w: 52 },
      ];

      const dRows = data.diagnoses.map((d: any) => [
        { text: d.icd10_code || '\u2014', align: 'center' },
        { text: (d.icd10?.description || '\u2014').slice(0, 28) },
        { text: (d.preliminary_diagnosis || '\u2014').slice(0, 35) },
        { text: (d.chief_complaint || '\u2014').slice(0, 30) },
        { text: (d.examination_findings || '\u2014').slice(0, 30) },
        { text: d.is_primary ? 'Yes' : 'No', align: 'center' },
      ]);

      const dy = drawTable(dHeaders, dRows, doc.y);
      doc.y = dy + 4;
    }

    // ═══════════════════════════════════════════════════════════
    //  SECTION 4 — Test Orders
    // ═══════════════════════════════════════════════════════════
    if (data.testOrders.length > 0) {
      sectionHeader('03', 'TEST ORDERS');

      const tHeaders = [
        { label: 'Test Name', w: 110 },
        { label: 'Clinical Notes', w: 100 },
        { label: 'Status', w: 56, align: 'center' },
        { label: 'Result', w: 90 },
        { label: 'Abnormal', w: 50, align: 'center' },
        { label: 'Ordered At', w: 90 },
      ];

      const tRows = data.testOrders.map((o: any) => {
        const resultStr =
          o.results?.length > 0
            ? o.results.map((r: any) => r.result_value).join('; ')
            : 'Pending';
        const abnormalFlag = o.results?.some((r: any) => r.is_abnormal)
          ? 'Yes'
          : 'No';
        return [
          { text: (o.test?.test_name || '\u2014').slice(0, 30) },
          { text: (o.clinical_notes || '\u2014').slice(0, 30) },
          { text: o.status, align: 'center' },
          { text: resultStr.slice(0, 25) },
          { text: abnormalFlag, align: 'center' },
          {
            text: o.ordered_at
              ? new Date(o.ordered_at).toLocaleString('en-GB').slice(0, 10)
              : '\u2014',
            align: 'center',
          },
        ];
      });

      const ty = drawTable(tHeaders, tRows, doc.y);
      doc.y = ty + 4;
    }

    // ═══════════════════════════════════════════════════════════
    //  SECTION 5 — Prescriptions
    // ═══════════════════════════════════════════════════════════
    if (data.prescriptions.length > 0) {
      sectionHeader('04', 'PRESCRIPTIONS');

      const medHeaders = [
        { label: 'Generic Name', w: 90 },
        { label: 'Brand Name', w: 72 },
        { label: 'Dosage', w: 48, align: 'center' },
        { label: 'Frequency', w: 56, align: 'center' },
        { label: 'Duration', w: 40, align: 'center' },
        { label: 'Route', w: 40, align: 'center' },
        { label: 'Instructions', w: 110 },
      ];

      for (const rx of data.prescriptions) {
        const rxDate = rx.issued_at
          ? new Date(rx.issued_at).toLocaleString('en-GB').slice(0, 16)
          : '\u2014';

        doc
          .fillColor(brandTeal)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text('Prescription \u2014 ' + rxDate, MARGIN, doc.y);

        doc.moveDown(0.3);

        const medRows = (rx.medications || []).map((m: any) => [
          { text: m.generic_name || '\u2014' },
          { text: m.brand_name || '\u2014' },
          { text: m.dosage || '\u2014', align: 'center' },
          { text: m.frequency || '\u2014', align: 'center' },
          {
            text: m.duration_days != null ? String(m.duration_days) : '\u2014',
            align: 'center',
          },
          { text: m.route || '\u2014', align: 'center' },
          {
            text: m.special_instructions
              ? m.special_instructions.slice(0, 35)
              : '\u2014',
          },
        ]);

        if (medRows.length > 0) {
          const ry = drawTable(medHeaders, medRows, doc.y);
          doc.y = ry + 2;

          if (rx.notes) {
            doc
              .fillColor(textMedium)
              .fontSize(8)
              .font('Helvetica')
              .text('Notes: ' + rx.notes, MARGIN, doc.y, { width: PAGE_WIDTH });
            doc.moveDown(0.3);
          }
        } else {
          doc
            .fillColor(textLight)
            .fontSize(9)
            .font('Helvetica')
            .text('No medications recorded.', MARGIN, doc.y);
          doc.moveDown(0.5);
        }
        doc.moveDown(0.3);
      }
    }

    // ═══════════════════════════════════════════════════════════
    //  SECTION 6 — Referrals
    // ═══════════════════════════════════════════════════════════
    if (data.referrals.length > 0) {
      sectionHeader('05', 'REFERRALS');

      const refHeaders = [
        { label: 'Specialty', w: 80 },
        { label: 'Reason', w: 104 },
        { label: 'Clinical Summary', w: 104 },
        { label: 'Emergency', w: 54, align: 'center' },
        { label: 'Status', w: 56, align: 'center' },
        { label: 'Date', w: 98, align: 'center' },
      ];

      const refRows = data.referrals.map((r: any) => [
        { text: (r.specialty_code || '\u2014').slice(0, 20) },
        { text: (r.referral_reason || '\u2014').slice(0, 32) },
        { text: (r.clinical_summary || '\u2014').slice(0, 32) },
        { text: r.is_emergency ? 'Yes' : 'No', align: 'center' },
        { text: r.status || '\u2014', align: 'center' },
        {
          text: r.created_at
            ? new Date(r.created_at).toLocaleString('en-GB').slice(0, 10)
            : '\u2014',
          align: 'center',
        },
      ]);

      const rfY = drawTable(refHeaders, refRows, doc.y);
      doc.y = rfY + 4;
    }

    // ═══════════════════════════════════════════════════════════
    //  DIGITAL SIGNATURE
    // ═══════════════════════════════════════════════════════════
    doc.moveDown(1);
    const sigY = doc.y;

    doc
      .strokeColor(borderLight)
      .lineWidth(0.5)
      .moveTo(MARGIN, sigY)
      .lineTo(MARGIN + PAGE_WIDTH, sigY)
      .stroke();
    doc.moveDown(0.3);

    doc
      .fillColor(brandNavy)
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Digital Signature', MARGIN, doc.y);
    doc.moveDown(0.5);

    doc
      .fillColor(textDark)
      .fontSize(10)
      .font('Helvetica')
      .text('Dr. ' + doctorName, MARGIN, doc.y);

    if (dp.specialization) {
      doc
        .fillColor(textMedium)
        .fontSize(8)
        .font('Helvetica')
        .text(dp.specialization, MARGIN, doc.y);
    }
    doc.moveDown(0.5);

    // Signature line
    const slY = doc.y;
    doc
      .strokeColor(textDark)
      .lineWidth(1)
      .moveTo(MARGIN, slY)
      .lineTo(MARGIN + 180, slY)
      .stroke();
    doc
      .fillColor(textLight)
      .fontSize(7)
      .font('Helvetica')
      .text('Electronically generated signature', MARGIN, slY + 4);

    doc.moveDown(2);

    // Disclaimer
    const discY = doc.y;
    doc
      .strokeColor(borderLight)
      .lineWidth(0.5)
      .moveTo(MARGIN, discY)
      .lineTo(MARGIN + PAGE_WIDTH, discY)
      .stroke();
    doc.moveDown(0.3);
    doc
      .fillColor(textLight)
      .fontSize(7)
      .font('Helvetica')
      .text(
        'This is a computer-generated clinical consultation report issued by Aastha Tele-Healthcare. ' +
          'This report contains the clinical findings, diagnoses, prescriptions, and referrals recorded during the ' +
          'tele-consultation session. No physical signature is required. ' +
          'If you have any questions regarding this report, please contact Aastha Tele-Healthcare at the earliest convenience.',
        MARGIN,
        doc.y,
        { width: PAGE_WIDTH, align: 'left' },
      );

    // Draw footer on first page
    drawFooter();

    doc.end();

    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
