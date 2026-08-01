import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CacheEntry {
  buffer: Buffer;
  expiresAt: number;
}

@Injectable()
export class SpecialistDicomService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxCacheSize = 50;
  private readonly ttlMs = 1000 * 60 * 60;

  constructor(private prisma: PrismaService) {}

  async findAll(patientId?: string) {
    const where = patientId ? { patient_id: patientId } : {};

    return this.prisma.specialist_dicom_studies.findMany({
      where,
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
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.specialist_dicom_studies.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            mrn: true,
            date_of_birth: true,
            sex: true,
          },
        },
      },
    });
  }

  async getCachedBuffer(studyId: string, fileUrl: string): Promise<Buffer> {
    const cached = this.cache.get(studyId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.buffer;
    }

    if (cached) {
      this.cache.delete(studyId);
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch DICOM from ${fileUrl}: ${response.status}`,
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    this.setCache(studyId, buffer);
    return buffer;
  }

  private setCache(studyId: string, buffer: Buffer) {
    if (this.cache.size >= this.maxCacheSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(studyId, { buffer, expiresAt: Date.now() + this.ttlMs });
  }
}
