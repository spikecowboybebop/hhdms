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
    console.log(
      `[NOTIFICATION] registerToken userId=${userId}, deviceType=${deviceType}`,
    );

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

    // Flush any undelivered notifications that were created before this
    // user registered a device token (e.g. provider_assigned created when
    // the booking was made before the doctor ever logged in).
    await this.flushUndelivered(userId);
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
        mbbs_doctor: 'mbbs_doctors',
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
        mbbs_doctor: 'mbbs_doctors',
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

    console.log(
      `[NOTIFICATION] getPendingNotifications userId=${userId}, found=${notifications.length}, types=[${notifications.map((n) => n.type).join(', ')}]`,
    );

    // Prune stale doctor_coming notifications that have no active booking
    // session — only if the notification is older than 30 minutes.
    // Recent notifications are kept so the patient can see them before
    // the booking session is reflected in the database.
    if (notifications.some((n) => n.type === 'doctor_coming')) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentDoctorComing = notifications.some(
        (n) => n.type === 'doctor_coming' && n.created_at > thirtyMinutesAgo,
      );
      if (!recentDoctorComing) {
        const activeSession = await this.prisma.booking_sessions.findFirst({
          where: {
            patient: { user_id: userId },
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
          },
        });
        if (!activeSession) {
          await this.prisma.server_notifications.deleteMany({
            where: {
              user_id: userId,
              type: 'doctor_coming',
              delivered: false,
            },
          });
        }
      }
    }

    // Re-fetch after possible deletion of stale entries
    const remaining = await this.prisma.server_notifications.findMany({
      where: { user_id: userId, delivered: false },
      orderBy: { created_at: 'desc' },
    });

    // Don't send FCM push here — sendToUser() already handles push for
    // newly created notifications. This endpoint only returns the pending
    // data to the client so it can update its in-app state.
    await this.prisma.server_notifications.updateMany({
      where: { user_id: userId, delivered: false },
      data: { delivered: true },
    });

    return remaining;
  }

  private async sendFcmPush(
    userId: string,
    notification: {
      title: string;
      body: string;
      session_id?: string | null;
      type?: string | null;
      patient_id?: string | null;
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
    if (notification.patient_id) data.patient_id = notification.patient_id;

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

  private async flushUndelivered(userId: string) {
    const pending = await this.prisma.server_notifications.findMany({
      where: { user_id: userId, delivered: false },
    });
    if (pending.length === 0) return;

    // Do NOT mark as delivered — let getPendingNotifications (polling loop)
    // be the sole owner of the delivered flag. This ensures the polling loop
    // serves as a reliable fallback when FCM delivery fails.
    console.log(
      `[NOTIFICATION] flushUndelivered userId=${userId}, count=${pending.length}`,
    );
    for (const n of pending) {
      await this.sendFcmPush(userId, {
        title: n.title,
        body: n.body,
        session_id: n.session_id,
        type: n.type,
        patient_id: n.patient_id,
      }).catch(() => {});
    }
  }

  async sendToUser(
    userId: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ) {
    console.log(
      `[NOTIFICATION] sendToUser userId=${userId}, title="${notification.title}", type=${data?.type ?? 'none'}, session_id=${data?.session_id ?? 'none'}, patient_id=${data?.patient_id ?? 'none'}`,
    );

    // Always persist to DB for offline delivery
    await this.prisma.server_notifications
      .create({
        data: {
          user_id: userId,
          title: notification.title,
          body: notification.body,
          session_id: data?.session_id ?? null,
          type: data?.type ?? null,
          patient_id: data?.patient_id ?? null,
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

    console.log(
      `[NOTIFICATION] Sending FCM push to user ${userId}, tokens=${tokens.length}`,
    );

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
