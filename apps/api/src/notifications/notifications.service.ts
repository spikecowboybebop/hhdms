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
    // Remove stale entries for this token from other users (same device,
    // previous user logged out). This ensures only the active user gets
    // push notifications on this device.
    await this.prisma.fcm_tokens.deleteMany({
      where: { token, user_id: { not: userId } },
    });

    // Upsert on the composite key [user_id, token] — after removing @unique
    // from the token column, the same token may exist for multiple users.
    await this.prisma.fcm_tokens.upsert({
      where: { user_id_token: { user_id: userId, token } },
      update: { device_type: deviceType },
      create: { user_id: userId, token, device_type: deviceType },
    });

    // Subscribe MBBS/doctor tokens to a topic so topic broadcasts
    // reach them even if individual push fails.
    await this.subscribeToRoleTopic(userId, token);
  }

  private async subscribeToRoleTopic(userId: string, token: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: { select: { name: true } } },
      });

      const roleName = user?.role?.name?.toLowerCase();
      if (!roleName) return;

      // Map role to FCM topic name
      const topicMap: Record<string, string> = {
        mbbs: 'mbbs_doctors',
        specialist: 'specialists',
        caregiver: 'caregivers',
        nutritionist: 'nutritionists',
      };

      const topic = topicMap[roleName];
      if (topic) {
        try {
          const messaging = getMessaging();
          await messaging.subscribeToTopic([token], topic);
        } catch {
          // topic subscription is best-effort
        }
      }
    } catch {
      // role lookup is best-effort
    }
  }

  async unsubscribeToken(userId: string, token: string) {
    // Unsubscribe from any role topics before deleting (best-effort)
    await this.unsubscribeFromTopic(userId, token);

    await this.prisma.fcm_tokens.deleteMany({
      where: { user_id: userId, token },
    });
  }

  private async unsubscribeFromTopic(userId: string, token: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: { select: { name: true } } },
      });
      const roleName = user?.role?.name?.toLowerCase();
      if (!roleName) return;

      const topicMap: Record<string, string> = {
        mbbs: 'mbbs_doctors',
        specialist: 'specialists',
        caregiver: 'caregivers',
        nutritionist: 'nutritionists',
      };
      const topic = topicMap[roleName];
      if (topic) {
        await getMessaging().unsubscribeFromTopic([token], topic);
      }
    } catch {
      // best-effort
    }
  }

  async getPendingNotifications(userId: string) {
    const notifications = await this.prisma.server_notifications.findMany({
      where: { user_id: userId, delivered: false },
      orderBy: { created_at: 'desc' },
    });

    // Send FCM pushes for pending notifications so the device gets a
    // system-tray notification. This runs before marking them delivered
    // so the push is not lost even if the client races ahead.
    if (notifications.length > 0) {
      await this.sendFcmPush(userId, notifications[0]).catch(() => {});
    }

    await this.prisma.server_notifications.updateMany({
      where: { user_id: userId, delivered: false },
      data: { delivered: true },
    });

    return notifications;
  }

  private async sendFcmPush(
    userId: string,
    notification: {
      title: string;
      body: string;
      session_id?: string | null;
      type?: string | null;
    },
  ) {
    const tokens = await this.prisma.fcm_tokens.findMany({
      where: { user_id: userId },
      select: { token: true },
    });
    if (tokens.length === 0) return;

    const data: Record<string, string> = {};
    if (notification.session_id) data.session_id = notification.session_id;
    if (notification.type) data.type = notification.type;

    await getMessaging().sendEachForMulticast({
      tokens: tokens.map((t) => t.token),
      notification: { title: notification.title, body: notification.body },
      data,
      android: {
        priority: 'high',
        notification: { channelId: 'service_bookings', priority: 'high' },
      },
    });
  }

  async sendToUser(
    userId: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ) {
    // Always persist to DB for offline delivery
    await this.prisma.server_notifications
      .create({
        data: {
          user_id: userId,
          title: notification.title,
          body: notification.body,
          session_id: data?.session_id ?? null,
          type: data?.type ?? null,
        },
      })
      .catch((err) =>
        console.error('[NOTIFICATION] Failed to persist notification:', err),
      );

    const tokens = await this.prisma.fcm_tokens.findMany({
      where: { user_id: userId },
      select: { token: true },
    });

    if (tokens.length === 0) {
      console.log(
        `[NOTIFICATION] No FCM tokens for user ${userId}, notification persisted to DB only`,
      );
      return;
    }

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
