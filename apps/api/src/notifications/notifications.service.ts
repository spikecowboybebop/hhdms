import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      console.warn(
        'Firebase credentials not configured. Push notifications will be disabled.',
      );
      return;
    }

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId,
          privateKey,
          clientEmail,
        }),
      });
    }
  }

  async registerToken(userId: string, token: string, deviceType = 'android') {
    await this.prisma.fcm_tokens.upsert({
      where: { token },
      update: { user: { connect: { id: userId } }, device_type: deviceType },
      create: { user: { connect: { id: userId } }, token, device_type: deviceType },
    });
  }

  async unregisterToken(userId: string, token: string) {
    await this.prisma.fcm_tokens.deleteMany({
      where: { user: { id: userId }, token },
    });
  }

  async sendToUser(
    userId: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ) {
    const tokens = await this.prisma.fcm_tokens.findMany({
      where: { user_id: userId },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const registrationTokens = tokens.map((t) => t.token);

    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens: registrationTokens,
        notification,
        data,
        android: {
          priority: 'high',
          notification: {
            channelId: 'service_bookings',
            priority: 'high',
          },
        },
      });

      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push(registrationTokens[idx]);
          }
        });
        if (failedTokens.length > 0) {
          await this.prisma.fcm_tokens.deleteMany({
            where: { token: { in: failedTokens } },
          });
        }
      }
    } catch (err) {
      console.error('Failed to send push notification:', err);
    }
  }
}
