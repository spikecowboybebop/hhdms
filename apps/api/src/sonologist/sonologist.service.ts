import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsgReportDto } from './dto/create-usg-report.dto';

@Injectable()
export class SonologistService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifySonologist(userId: string) {
    const profile = await this.prisma.sonologist_profiles.findUnique({
      where: { user_id: userId },
    });
    if (!profile) {
      throw new ForbiddenException(
        'Only sonologists can access this resource.',
      );
    }
    return profile;
  }

  // ── Profile ────────────────────────────────────────────────

  async getProfile(userId: string) {
    await this.verifySonologist(userId);
    return this.prisma.sonologist_profiles.findUnique({
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
      },
    });
  }

  // ── Studies ────────────────────────────────────────────────

  async getMyStudies(userId: string) {
    await this.verifySonologist(userId);
    return this.prisma.sonologist_studies.findMany({
      where: { sonologist_id: userId },
      orderBy: { study_date: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            sex: true,
            date_of_birth: true,
          },
        },
        reports: true,
      },
    });
  }

  async getStudy(studyId: string, userId: string) {
    await this.verifySonologist(userId);
    const study = await this.prisma.sonologist_studies.findFirst({
      where: { id: studyId, sonologist_id: userId },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
            sex: true,
            date_of_birth: true,
            phone_number: true,
            address_line1: true,
            district: true,
          },
        },
        reports: true,
      },
    });
    if (!study) throw new NotFoundException('USG study not found.');
    return study;
  }

  async createStudy(userId: string, dto: CreateUsgReportDto) {
    await this.verifySonologist(userId);

    const patient = await this.prisma.patients.findUnique({
      where: { id: dto.patient_id },
    });
    if (!patient) throw new NotFoundException('Patient not found.');

    const study = await this.prisma.sonologist_studies.create({
      data: {
        sonologist_id: userId,
        patient_id: dto.patient_id,
        body_part: dto.body_part,
        findings: dto.findings,
        impression: dto.impression,
        storage_url: dto.storage_url,
        dicom_series_uids: dto.dicom_series_uids,
        status: 'COMPLETED',
      },
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

    if (dto.annotated_images || dto.impression) {
      await this.prisma.sonologist_reports.create({
        data: {
          study_id: study.id,
          sonologist_id: userId,
          patient_id: dto.patient_id,
          findings: dto.findings,
          impression: dto.impression,
          annotated_images: dto.annotated_images,
        },
      });
    }

    return study;
  }

  // ── Reports ────────────────────────────────────────────────

  async getMyReports(userId: string) {
    await this.verifySonologist(userId);
    return this.prisma.sonologist_reports.findMany({
      where: { sonologist_id: userId },
      orderBy: { report_date: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            first_name_en: true,
            last_name_en: true,
          },
        },
        study: {
          select: {
            id: true,
            body_part: true,
            modality: true,
          },
        },
      },
    });
  }

  // ── Patients ───────────────────────────────────────────────

  async getMyPatients(userId: string) {
    await this.verifySonologist(userId);
    const studies = await this.prisma.sonologist_studies.findMany({
      where: { sonologist_id: userId },
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
            date_of_birth: true,
          },
        },
      },
      orderBy: { study_date: 'desc' },
    });

    const seen = new Set<string>();
    return studies
      .filter((s) => {
        const dup = seen.has(s.patient.id);
        seen.add(s.patient.id);
        return !dup;
      })
      .map((s) => s.patient);
  }

  // ── Dashboard Stats ────────────────────────────────────────

  async getDashboardStats(userId: string) {
    await this.verifySonologist(userId);
    const [totalStudies, totalReports, recentStudies] = await Promise.all([
      this.prisma.sonologist_studies.count({
        where: { sonologist_id: userId },
      }),
      this.prisma.sonologist_reports.count({
        where: { sonologist_id: userId },
      }),
      this.prisma.sonologist_studies.findMany({
        where: { sonologist_id: userId },
        orderBy: { study_date: 'desc' },
        take: 5,
        include: {
          patient: {
            select: { first_name_en: true, last_name_en: true, mrn: true },
          },
        },
      }),
    ]);

    return {
      total_studies: totalStudies,
      total_reports: totalReports,
      recent_studies: recentStudies,
    };
  }
}
