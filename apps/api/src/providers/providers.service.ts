import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailableProvidersQueryDto } from './dto/available-providers-query.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAvailableProviders(query: AvailableProvidersQueryDto) {
    if (query.serviceType !== 'MBBS') {
      throw new BadRequestException(
        `Unsupported service type: ${query.serviceType}. Only "MBBS" is supported.`,
      );
    }

    const where: Record<string, unknown> = {
      is_available: true,
    };

    if (query.district) {
      where.district = query.district;
    }

    if (query.thana) {
      where.thana = query.thana;
    }

    if (query.date) {
      const date = new Date(query.date);
      const dayOfWeek = date.getDay();
      where.schedules = {
        some: {
          day_of_week: dayOfWeek,
          is_available: true,
        },
      };
    }

    const providers = await this.prisma.mbbs_doctor_profiles.findMany({
      where,
      include: {
        user: {
          select: {
            firstNameEn: true,
            lastNameEn: true,
            email: true,
            phoneNumber: true,
          },
        },
        schedules: {
          where: { is_available: true },
          select: {
            day_of_week: true,
            start_time: true,
            end_time: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      providers: providers.map((p) => ({
        userId: p.user_id,
        name: `${p.user.firstNameEn} ${p.user.lastNameEn}`,
        email: p.user.email,
        phoneNumber: p.user.phoneNumber,
        specialization: p.specialization,
        qualification: p.qualification,
        yearsOfExperience: p.years_of_experience,
        consultationFee: p.consultation_fee ? Number(p.consultation_fee) : null,
        district: p.district,
        thana: p.thana,
        schedules: p.schedules.map((s) => ({
          dayOfWeek: s.day_of_week,
          startTime: s.start_time,
          endTime: s.end_time,
        })),
      })),
    };
  }
}
