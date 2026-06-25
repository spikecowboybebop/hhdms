# Notification Engine (NF) Module — Full Implementation Plan

## Overview

The Notification Engine powers all outbound communications across HHDMS. It is referenced by `TODO` comments in `mbbs.service.ts` at 5 integration points. This plan covers **A–Z**: from Prisma schema through NestJS module, services, providers, integration hooks, frontend components, and free-tier provider strategy.

---

## A. Prisma Schema — New Database Models

Add the following models to `apps/api/prisma/schema.prisma`:

### A.1 `notification_templates`
Stores the message body for each trigger event, per channel and locale.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `trigger_event` | String (50) | NF-001 through NF-012 |
| `channel` | String (20) | `SMS`, `WHATSAPP`, `EMAIL`, `PUSH`, `IN_APP` |
| `locale` | String (10) | `en`, `bn` |
| `subject` | String (200) | For email |
| `body_template` | Text | With `{{placeholders}}` |
| `is_active` | Boolean | default true |
| `created_at` | Timestamptz | |
| `updated_at` | Timestamptz | |

**Enum additions:**
```prisma
enum NotificationChannelEnum {
  SMS
  WHATSAPP
  EMAIL
  PUSH
  IN_APP

  @@map("notification_channel_enum")
}

enum NotificationStatusEnum {
  PENDING
  SENT
  DELIVERED
  FAILED
  READ

  @@map("notification_status_enum")
}
```

### A.2 `notification_logs`
Audit trail for every notification sent or failed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `trigger_event` | String (50) | NF-001… |
| `channel` | NotificationChannelEnum | |
| `recipient_id` | String? (UUID) | User or Patient FK |
| `recipient_phone` | String? (20) | Denormalised |
| `recipient_email` | String? (255) | |
| `message_body` | Text | Rendered text |
| `status` | NotificationStatusEnum | default PENDING |
| `provider_msg_id` | String? (255) | ID from Twilio/WhatsApp API |
| `error_message` | Text? | |
| `sent_at` | Timestamptz? | |
| `delivered_at` | Timestamptz? | |
| `read_at` | Timestamptz? | |
| `created_at` | Timestamptz | default now() |
| `updated_at` | Timestamptz | default now() |

### A.3 `notification_preferences`
Per-user opt-in/opt-out per channel and trigger event.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `channel` | NotificationChannelEnum | |
| `trigger_event` | String (50) | |
| `is_opted_in` | Boolean | default true |
| `created_at` | Timestamptz | |
| `updated_at` | Timestamptz | |

```
@@unique([user_id, channel, trigger_event])
```

### A.4 `device_tokens`
For push notifications to mobile app / in-app alerts.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `device_token` | String (512) | FCM / Web Push token |
| `platform` | String (20) | `web`, `android`, `ios` |
| `is_active` | Boolean | default true |
| `created_at` | Timestamptz | |
| `updated_at` | Timestamptz | |

```
@@unique([user_id, device_token])
```

---

## B. Notification Templates — Seed Data

Pre-populate `notification_templates` with Bengali & English versions of all 12 trigger events. Store in `prisma/seeds/notification-templates.ts`. Use `{{patient_name}}`, `{{provider_name}}`, `{{ticket_id}}`, `{{date_time}}`, `{{eta}}`, `{{tracking_link}}`, `{{payment_link}}`, `{{amount}}`, `{{report_link}}`, etc. as placeholders.

**Example — NF-001 (Appointment Confirmed):**

```typescript
{
  trigger_event: 'NF-001',
  channel: 'SMS',
  locale: 'en',
  body_template: 'Appointment confirmed! Ticket: {{ticket_id}}. Provider: {{provider_name}} on {{date_time}}. Track: {{tracking_link}}',
  is_active: true,
},
{
  trigger_event: 'NF-001',
  channel: 'SMS',
  locale: 'bn',
  body_template: 'অ্যাপয়েন্টমেন্ট নিশ্চিত! টিকিট: {{ticket_id}}। প্রদানকারী: {{provider_name}} তারিখ: {{date_time}}। ট্র্যাক করুন: {{tracking_link}}',
  is_active: true,
},
```

---

## C. NestJS Notification Module Structure

```
apps/api/src/notification/
├── notification.module.ts            # Module definition
├── notification.controller.ts       # REST endpoints (admin + user)
├── notification.service.ts          # Core orchestration logic
├── notification.gateway.ts          # Socket.IO gateway for real-time in-app alerts
│
├── providers/
│   ├── sms.provider.ts              # SMS provider interface (abstract)
│   ├── sms-twilio.provider.ts       # Twilio implementation
│   ├── sms-local.provider.ts        # Local BD SMS gateway implementation
│   ├── whatsapp.provider.ts         # WhatsApp provider interface (abstract)
│   ├── whatsapp-cloud.provider.ts   # Meta WhatsApp Cloud API implementation
│   ├── push.provider.ts             # Push notification interface (abstract)
│   ├── push-fcm.provider.ts         # Firebase Cloud Messaging implementation
│   └── email.provider.ts            # Nodemailer / SendGrid implementation
│
├── processors/
│   ├── template.processor.ts        # Template rendering with placeholders
│   ├── queue.processor.ts           # Background job queue management
│   └── retry.processor.ts           # Exponential backoff retry logic
│
├── dto/
│   ├── send-notification.dto.ts
│   ├── create-template.dto.ts
│   ├── update-template.dto.ts
│   ├── update-preference.dto.ts
│   └── register-device.dto.ts
│
└── interfaces/
    ├── notification-provider.interface.ts
    ├── notification-payload.interface.ts
    └── notification-result.interface.ts
```

### C.1 `notification.module.ts`

```typescript
import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MbbsModule } from '../mbbs/mbbs.module';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { SmsTwilioProvider } from './providers/sms-twilio.provider';
import { SmsLocalProvider } from './providers/sms-local.provider';
import { WhatsAppCloudProvider } from './providers/whatsapp-cloud.provider';
import { PushFcmProvider } from './providers/push-fcm.provider';
import { EmailProvider } from './providers/email.provider';
import { TemplateProcessor } from './processors/template.processor';
import { RetryProcessor } from './processors/retry.processor';

@Module({
  imports: [PrismaModule, forwardRef(() => MbbsModule)],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationGateway,
    {
      provide: 'SMS_PROVIDER',
      useFactory: () => {
        const provider = process.env.SMS_PROVIDER || 'twilio';
        return provider === 'local' ? new SmsLocalProvider() : new SmsTwilioProvider();
      },
    },
    { provide: 'WHATSAPP_PROVIDER', useClass: WhatsAppCloudProvider },
    { provide: 'PUSH_PROVIDER', useClass: PushFcmProvider },
    { provide: 'EMAIL_PROVIDER', useClass: EmailProvider },
    TemplateProcessor,
    RetryProcessor,
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
```

### C.2 `notification.service.ts` — Core API

Main methods:

| Method | Purpose |
|--------|---------|
| `send(triggerEvent, recipient, channel, context)` | Orchestrate a single notification |
| `sendMulti(triggerEvent, recipients[], channel, context)` | Bulk send (e.g. admin broadcast) |
| `renderTemplate(templateId, locale, context)` | Fill placeholders using Handlebars |
| `sendSms(phone, message)` | Route to SMS provider |
| `sendWhatsApp(phone, message)` | Route to WhatsApp provider |
| `sendEmail(email, subject, body)` | Route to email provider |
| `sendPush(userId, title, body, data)` | Route to FCM provider |
| `sendInApp(userId, notificationPayload)` | Emit via Socket.IO to connected client |
| `getDeliveryStatus(logId)` | Query provider for delivery receipt |
| `retryFailed(fromHoursAgo)` | Retry all FAILED logs within window |
| `saveLog(payload, status)` | Persist to notification_logs |

**Flow for `send()`:**
1. Check user preferences — skip if opted out
2. Load template for trigger_event + channel + locale (fallback to `en`)
3. Render template with context using `TemplateProcessor`
4. Route to appropriate provider based on channel
5. Save log with `PENDING` status
6. On provider callback, update to `SENT` / `DELIVERED` / `FAILED`
7. If failed, pass to `RetryProcessor`

### C.3 `notification.gateway.ts` — Real-Time In-App Alerts

Extend the existing Socket.IO infrastructure. Add a dedicated namespace `/notifications`:

- Client joins room `user:<userId>` on connection
- Server emits `notification:new` with payload
- Used for NF-006 (WhatsApp message received), NF-007 (emergency alert), NF-003 (assignment push)

---

## D. Provider Strategy — Free & Low-Cost Options

### D.1 WhatsApp — Meta WhatsApp Cloud API (Free Tier)

**Provider**: `WhatsAppCloudProvider` (`whatsapp-cloud.provider.ts`)

| Detail | Info |
|--------|------|
| **Cost** | Free up to **1,000 conversations/month** per business account |
| **Setup** | Meta Business Account + WhatsApp Business Account + Phone Number |
| **API** | Graph API v21+ endpoints: `POST /{{phone-number-id}}/messages` |
| **Auth** | Permanent Access Token (System User) or short-lived from Meta Business Suite |
| **Message Types** | Templates (pre-approved by Meta) + Session messages (free-form within 24h of user message) |
| **Limitations** | Only template messages for proactive outreach (first message). Free tier covers 1K conversations/mo from all directions. |
| **BD Support** | Works in Bangladesh |
| **SDK** | `graph-api` or raw `axios` calls |

**Implementation:**
```
npm install axios
```

```typescript
// whatsapp-cloud.provider.ts
async send(phone: string, templateName: string, params: string[]): Promise<NotificationResult> {
  const response = await axios.post(
    `https://graph.facebook.com/v21.0/${process.env.META_WA_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'en' },
        components: [{
          type: 'body',
          parameters: params.map(p => ({ type: 'text', text: p })),
        }],
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.META_WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return { success: true, providerMsgId: response.data.messages?.[0]?.id };
}
```

**Webhook setup** — Meta sends delivery receipts and inbound messages to a public URL:
- Endpoint: `POST /notification/whatsapp-webhook`
- Verify: `GET /notification/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<challenge>`
- Process `statuses` array for delivery receipts → update `notification_logs`

### D.2 SMS — Twilio (Trial + Pay-As-You-Go)

**Provider**: `SmsTwilioProvider` (`sms-twilio.provider.ts`)

| Detail | Info |
|--------|------|
| **Cost** | Free trial: $15 credit (no credit card required for trial). After trial: ~$0.0079/SMS in Bangladesh (~0.60 BDT per SMS) |
| **Setup** | Twilio account → purchase phone number → enable SMS → configure status callback |
| **API** | Twilio REST API |
| **SDK** | `twilio` npm package |

**Implementation:**
```
npm install twilio
```

```typescript
// sms-twilio.provider.ts
import { Twilio } from 'twilio';

export class SmsTwilioProvider {
  private client: Twilio;

  constructor() {
    this.client = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }

  async send(phone: string, message: string): Promise<NotificationResult> {
    const result = await this.client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
      body: message,
      statusCallback: `${process.env.API_BASE_URL}/notification/twilio-webhook`,
    });
    return { success: true, providerMsgId: result.sid };
  }
}
```

### D.3 SMS — Local Bangladesh SMS Gateway (Cost-Effective Alternative)

**Provider**: `SmsLocalProvider` (`sms-local.provider.ts`)

| Provider | API Type | Est. Cost |
|----------|----------|-----------|
| **BulkSMSBD** | HTTP GET/POST | ~0.30–0.50 BDT/SMS |
| **SMSinBD** | HTTP POST (JSON) | ~0.35 BDT/SMS |
| **SSL Wireless** | REST API | Enterprise pricing |
| **DHL SE / SilkRoute** | HTTP/SMPP | Bulk pricing |

Implement a **strategy pattern** so `SMS_PROVIDER` can be toggled between Twilio and local via `.env`:

```
SMS_PROVIDER=twilio|local
```

```typescript
// sms-local.provider.ts
async send(phone: string, message: string): Promise<NotificationResult> {
  const response = await axios.post(process.env.LOCAL_SMS_API_URL, {
    api_key: process.env.LOCAL_SMS_API_KEY,
    sender_id: process.env.LOCAL_SMS_SENDER_ID || 'Aastha',
    numbers: phone,
    message: message,
  });
  return {
    success: response.data?.status === 'success',
    providerMsgId: response.data?.message_id,
  };
}
```

### D.4 Push Notifications — Firebase Cloud Messaging (Free)

**Provider**: `PushFcmProvider` (`push-fcm.provider.ts`)

| Detail | Info |
|--------|------|
| **Cost** | **Free**, unlimited |
| **Setup** | Firebase project → Generate Service Account JSON → Web push certificate (VAPID) |
| **SDK** | `firebase-admin` npm package |

**Implementation:**
```
npm install firebase-admin
```

```typescript
// push-fcm.provider.ts
import * as admin from 'firebase-admin';

export class PushFcmProvider {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FCM_PROJECT_ID,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
  }

  async send(userId: string, title: string, body: string, data?: Record<string, string>): Promise<NotificationResult> {
    const tokens = await this.getDeviceTokens(userId);
    if (!tokens.length) return { success: false, error: 'No device tokens' };

    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
    });

    return { success: true, providerMsgId: result.responses.map(r => r.messageId).join(',') };
  }

  private async getDeviceTokens(userId: string): Promise<string[]> {
    // Query from device_tokens table where is_active = true
  }
}
```

### D.5 Email — Nodemailer (Free) + SMTP

**Provider**: `EmailProvider` (`email.provider.ts`)

| Detail | Info |
|--------|------|
| **Cost** | Free with Gmail SMTP (500/day). Production: SendGrid free tier (100/day) or SES. |
| **SDK** | `nodemailer` npm package |

**Implementation:**
```
npm install nodemailer
```

```typescript
// email.provider.ts
import * as nodemailer from 'nodemailer';

export class EmailProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async send(to: string, subject: string, body: string): Promise<NotificationResult> {
    const result = await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@aastha-health.com',
      to,
      subject,
      html: body,
    });
    return { success: true, providerMsgId: result.messageId };
  }
}
```

---

## E. Integration Points — Hooking into Existing Modules

### E.1 MBBS Module (4 existing TODOs)

| File | Line | Trigger | Integration Code |
|------|------|---------|-----------------|
| `mbbs.service.ts` | 450 | Test order → NF-004 (lab notification) | After `orderTests()` → `this.notificationService.send('NF-004', {...})` |
| `mbbs.service.ts` | 588 | Referral → NF-003 (specialist alert) | After `createReferral()` → `this.notificationService.send('NF-003', {...})` |
| `mbbs.service.ts` | 699 | Prescription → NF-010 (WhatsApp PDF) | After `createPrescription()` → `this.notificationService.send('NF-010', {...})` |
| `mbbs.service.ts` | 763 | Emergency → NF-007 (admin + on-duty) | After `setEmergencyFlag()` → `this.notificationService.send('NF-007', {...})` |

**Approach:** Inject `NotificationService` into `MbbsService`:
```typescript
import { Inject, forwardRef } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class MbbsService {
  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    // ... other deps
  ) {}
}
```

### E.2 Call Center Module (future)

| Trigger | Action |
|---------|--------|
| Appointment confirmed (NF-001) | After call agent books appointment → SMS to patient |
| 24h reminder (NF-002) | Cron job scanning scheduled_at |
| 1h reminder (NF-002b) | Cron job scanning scheduled_at with ETA |

### E.3 Scheduling & Dispatch Module (future)

| Trigger | Action |
|---------|--------|
| Provider dispatched (NF-008) | After dispatch assignment |
| Provider arrives (NF-009) | After GPS geofence trigger |
| New assignment (NF-003) | On assignment creation → push to provider |

### E.4 Billing Module (future)

| Trigger | Action |
|---------|--------|
| Invoice generated (NF-005) | After invoice creation |
| Invoice overdue (NF-005b) | Cron job scanning due dates |

### E.5 Diagnostic Services Module (future)

| Trigger | Action |
|---------|--------|
| Lab report finalized (NF-004) | When test result status → COMPLETED |

### E.6 Nutritionist Module (future)

| Trigger | Action |
|---------|--------|
| Diet plan generated (NF-011) | After diet plan creation |
| Follow-up due (NF-012) | Cron job scanning follow-up dates |

---

## F. Cron Jobs / Scheduled Tasks

Add `@nestjs/schedule` to the API:

```
npm install @nestjs/schedule
```

Register in `AppModule`:
```typescript
import { ScheduleModule } from '@nestjs/schedule';
@Module({ imports: [ScheduleModule.forRoot(), ...] })
```

Create `apps/api/src/notification/notification-scheduler.service.ts`:

| Job | Cron Expression | Description |
|-----|----------------|-------------|
| **NF-002** | `0 * * * *` (hourly) | Find appointments scheduled ~24h from now → send reminder |
| **NF-002b** | `*/15 * * * *` (every 15 min) | Find appointments scheduled ~1h from now → send reminder with ETA |
| **NF-005b** | `0 9 * * *` (daily 9 AM) | Find invoices due +3 days → send payment reminder |
| **NF-012** | `0 8 * * *` (daily 8 AM) | Find follow-ups due in ~48h → send reminder |
| **Retry** | `*/30 * * * *` (every 30 min) | Retry FAILED logs from past 6 hours |

---

## G. REST API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/notification/templates` | Admin | List all templates, filter by trigger_event, channel, locale |
| `POST` | `/notification/templates` | Admin | Create new template |
| `PATCH` | `/notification/templates/:id` | Admin | Update template body, toggle active |
| `DELETE` | `/notification/templates/:id` | Admin | Soft-delete (deactivate) template |
| `GET` | `/notification/logs` | Admin | Query logs with filters (status, trigger, date range, recipient) |
| `GET` | `/notification/logs/:id` | Admin | Single log detail |
| `POST` | `/notification/logs/:id/retry` | Admin | Retry a single failed notification |
| `POST` | `/notification/logs/retry-bulk` | Admin | Retry all failed logs from N hours ago |
| `GET` | `/notification/preferences` | Authenticated | Get current user's notification preferences |
| `PATCH` | `/notification/preferences` | Authenticated | Update preferences (opt-in/opt-out per channel × trigger) |
| `POST` | `/notification/device-token` | Authenticated | Register/update FCM device token |
| `POST` | `/notification/test/:channel` | Admin | Send test SMS/WhatsApp/Email to a phone/email |
| `POST` | `/notification/whatsapp-webhook` | Public | Meta webhook for delivery receipts & inbound messages |
| `GET` | `/notification/whatsapp-webhook` | Public | Meta webhook verification (challenge response) |
| `POST` | `/notification/twilio-webhook` | Public | Twilio status callback for SMS delivery receipts |

---

## H. Frontend (Next.js) — Notification UI

### H.1 Notification Bell Component
Add to `dashboard-shell.tsx`:
- Socket.IO client connects to `/notifications` namespace
- Bell icon with badge showing unread count
- Dropdown list of recent in-app notifications
- "Mark all read" action

```
apps/web/components/notifications/notification-bell.tsx
```

### H.2 Notification Templates Admin Page

```
apps/web/app/dashboard/admin/notifications/page.tsx
```

Features:
- Table of all templates (trigger_event × channel × locale)
- Search/filter by trigger event
- Inline editing of message bodies (EN + BN side by side)
- Toggle active/inactive per template
- "Send Test" button → opens modal with phone/email input

### H.3 Notification Preferences Page

```
apps/web/app/dashboard/settings/notifications/page.tsx
```

Features:
- Matrix of channels (columns) × trigger events (rows)
- Toggle switches for each cell (default: all ON)
- Save button → `PATCH /notification/preferences`

### H.4 In-App Toast/Alerts

```
apps/web/components/notifications/toast-container.tsx
```

- Listens to `notification:new` events via Socket.IO
- Displays animated toast/toast stack
- Dismissible, auto-dismiss after 8 seconds
- Priority-based coloring (emergency = red, normal = blue)

---

## I. Environment Variables (.env)

```bash
# ============================================
# Notification Engine — Provider Selection
# ============================================
SMS_PROVIDER=twilio
WHATSAPP_PROVIDER=meta
EMAIL_PROVIDER=nodemailer

# ============================================
# Twilio (SMS)
# ============================================
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
API_BASE_URL=https://api.aastha-health.com

# ============================================
# Local SMS Gateway (Bangladesh)
# ============================================
LOCAL_SMS_API_URL=
LOCAL_SMS_API_KEY=
LOCAL_SMS_SENDER_ID=Aastha

# ============================================
# Meta WhatsApp Cloud API
# ============================================
META_WA_PHONE_NUMBER_ID=
META_WA_ACCESS_TOKEN=
META_WA_BUSINESS_ACCOUNT_ID=
META_WA_WEBHOOK_VERIFY_TOKEN=your_verify_token_here

# ============================================
# Firebase Cloud Messaging (Push Notifications)
# ============================================
FCM_PROJECT_ID=
FCM_CLIENT_EMAIL=
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ============================================
# Email (Nodemailer / SMTP)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@aastha-health.com
```

---

## J. Implementation Checklist (A–Z)

| Step | Task | Dependencies | Est. Effort |
|------|------|--------------|-------------|
| **1** | Add Prisma enums (`NotificationChannelEnum`, `NotificationStatusEnum`) | — | 15 min |
| **2** | Add Prisma models (notification_templates, logs, preferences, device_tokens) | Step 1 | 45 min |
| **3** | Run `npx prisma migrate dev --name add_notification_engine` | Step 2 | 15 min |
| **4** | Create seed script: `prisma/seeds/notification-templates.ts` (12 triggers × 2 locales × 3 active channels = ~72 rows) | Step 2 | 2 hrs |
| **5** | Generate NestJS module: `nest g module notification` + `nest g service notification` + `nest g controller notification` | — | 15 min |
| **6** | Create interfaces: `notification-provider.interface.ts`, `notification-payload.interface.ts`, `notification-result.interface.ts` | — | 30 min |
| **7** | Implement `TemplateProcessor` (Handlebars-based rendering with placeholder validation) | — | 1 hr |
| **8** | Implement `NotificationService.send()` core method (render → route → log → return) | Steps 6-7 | 3 hrs |
| **9** | Implement `NotificationService.sendMulti()`, `retryFailed()`, `getDeliveryStatus()` | Step 8 | 1.5 hrs |
| **10** | Implement `WhatsAppCloudProvider` (Meta Cloud API — send template, handle response) | Step 6 | 3 hrs |
| **11** | Implement WhatsApp webhook handler (delivery receipts, inbound message parsing) | Step 10 | 2 hrs |
| **12** | Register notification templates with Meta Business Platform (wait for approval) | Step 11 | 2 days (async) |
| **13** | Implement `SmsTwilioProvider` (Twilio SDK integration) | Step 6 | 1.5 hrs |
| **14** | Implement Twilio status callback webhook | Step 13 | 1 hr |
| **15** | Implement `SmsLocalProvider` (alternative provider — HTTP POST to local BD gateway) | Step 6 | 1 hr |
| **16** | Implement `PushFcmProvider` (Firebase Admin SDK — send to device tokens) | Step 6 | 2 hrs |
| **17** | Implement `EmailProvider` (Nodemailer — SMTP transport) | Step 6 | 1 hr |
| **18** | Implement `NotificationGateway` (Socket.IO `/notifications` namespace — room join, emit) | — | 2 hrs |
| **19** | Implement `RetryProcessor` (exponential backoff: 1min → 5min → 15min → 1hr → 6hr → give up) | Step 8 | 1 hr |
| **20** | Install `@nestjs/schedule` + create `NotificationSchedulerService` | — | 30 min |
| **21** | Implement cron job: NF-002 (24h reminder) | Step 20 | 1 hr |
| **22** | Implement cron job: NF-002b (1h reminder) | Step 20 | 1 hr |
| **23** | Implement cron job: NF-005b (overdue invoice) | Step 20 | 30 min |
| **24** | Implement cron job: NF-012 (follow-up reminder) | Step 20 | 30 min |
| **25** | Implement cron job: retry failed logs (every 30 min) | Step 20 | 30 min |
| **26** | Create DTOs: `send-notification.dto.ts`, `create-template.dto.ts`, `update-template.dto.ts`, `update-preference.dto.ts`, `register-device.dto.ts` | — | 30 min |
| **27** | Implement REST endpoints: template CRUD | Step 26 | 1.5 hrs |
| **28** | Implement REST endpoints: log query + retry | Step 26 | 1 hr |
| **29** | Implement REST endpoints: preferences get/update | Step 26 | 30 min |
| **30** | Implement REST endpoint: device token registration | Step 26 | 30 min |
| **31** | Implement REST endpoint: test notification send | Step 26 | 30 min |
| **32** | Wire NF-004 → MBBS `orderTests()`: notify lab team | Steps 8, 33 | 30 min |
| **33** | Wire NF-003 → MBBS `createReferral()`: notify specialist | Steps 8, 33 | 30 min |
| **34** | Wire NF-010 → MBBS `createPrescription()`: send PDF link via WhatsApp | Steps 8, 33 | 30 min |
| **35** | Wire NF-007 → MBBS `setEmergencyFlag()`: alert admin + on-duty doctor | Steps 8, 33 | 30 min |
| **36** | Update `app.module.ts` to import `NotificationModule` | — | 5 min |
| **37** | Update `mbbs.module.ts` — add forwardRef to NotificationModule | — | 10 min |
| **38** | Frontend: Create Socket.IO notification listener hook (`useNotification`) | — | 1.5 hrs |
| **39** | Frontend: Notification bell + dropdown component in dashboard shell | Step 38 | 2 hrs |
| **40** | Frontend: Toast/alert container for real-time in-app notifications | Step 38 | 2 hrs |
| **41** | Frontend: Admin notification templates page (table + inline edit + test send modal) | — | 3 hrs |
| **42** | Frontend: User notification preferences settings page | — | 2 hrs |
| **43** | FCM Web Push: service worker + manifest.json + permission request | — | 2 hrs |
| **44** | Set up Twilio account, purchase number, configure status callback | — | 1 hr |
| **45** | Set up Meta Business account, WhatsApp Business Account, configure webhook | — | 2 hrs |
| **46** | Write unit tests: `NotificationService`, `TemplateProcessor`, each provider | Steps 8-18 | 3 hrs |
| **47** | Write e2e tests: notification REST endpoints, webhook handlers | Steps 27-31 | 2 hrs |
| **48** | Integration test: full flow (MBBS trigger → engine → provider → log) | Steps 32-35 | 2 hrs |

**Total estimated effort: ~45 hours development + 2 days Meta template approval**

---

## K. Architecture Diagram

```
┌─────────────┐     ┌─────────────────────────────────────────────────────────┐
│   MBBS      │     │              Notification Module                        │
│   Module    │────▶│                                                         │
│  (Service)  │     │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│             │     │  │ Template     │  │ Cron / Queue │  │ Retry        │  │
│  Call Cntr  │     │  │ Processor    │  │ Processor    │  │ Processor    │  │
│  (Future)   │────▶│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│             │     │         │                  │                  │         │
│  Dispatch   │     │         ▼                  ▼                  ▼         │
│  (Future)   │────▶│  ┌────────────────────────────────────────────────────┐ │
│             │     │  │              Notification Service                  │ │
│  Billing    │     │  └───────┬────────┬────────┬────────┬────────┬───────┘ │
│  (Future)   │────▶│          │        │        │        │        │         │
│             │     │          ▼        ▼        ▼        ▼        ▼         │
│  Nutrition  │     │  ┌────────┐ ┌──────────┐ ┌──────┐ ┌────────┐ ┌─────┐  │
│  (Future)   │────▶│  │ Twilio │ │ Meta WA  │ │ FCM  │ │Nodemail│ │Sock │  │
│             │     │  │ SMS    │ │ Cloud    │ │ Push │ │ er     │ │ IO  │  │
│             │     │  └────────┘ └──────────┘ └──────┘ └────────┘ └─────┘  │
│             │     │       │            │          │        │        │      │
└─────────────┘     │       ▼            ▼          ▼        ▼        ▼      │
                    │  ┌────────────────────────────────────────────────────┐ │
                    │  │              Notification Logs (DB)               │ │
                    │  │  templates | logs | preferences | device_tokens   │ │
                    │  └────────────────────────────────────────────────────┘ │
                    └─────────────────────────────────────────────────────────┘
```

---

## L. Module Dependency Graph

```
Notification Module (NF)
    ▲          ▲          ▲          ▲          ▲
    │          │          │          │          │
    │          │          │          │          │
┌───┴──┐  ┌───┴───┐  ┌───┴───┐  ┌───┴───┐  ┌──┴─────┐
│ MBBS │  │ Call  │  │Sched &│  │Billing│  │Nutrit. │
│ Doc  │  │Center │  │Dispatch│  │Payment│  │ ist    │
└──────┘  └───────┘  └───────┘  └───────┘  └────────┘
```

Build order:
1. **Phase 1** (Steps 1–19): Core engine — Prisma, module, service, all providers, gateway, template/retry processors
2. **Phase 2** (Steps 20–25): Scheduler — cron jobs for reminders
3. **Phase 3** (Steps 26–37): Integration — REST API + MBBS wiring
4. **Phase 4** (Steps 38–43): Frontend — components, admin pages, preferences, FCM push
5. **Phase 5** (Steps 44–48): DevOps — account setup, testing

---

## M. Free Tier Strategy Summary

| Channel | Provider | Truly Free? | Monthly Limit | At Scale Cost |
|---------|----------|-------------|---------------|---------------|
| **WhatsApp** | Meta Cloud API | ✅ Yes (free tier) | 1,000 conversations/month | ~$0.005–0.08/conversation (region-dependent) |
| **SMS** | Twilio | ⚠️ $15 trial credit | ~1,900 SMS (one-time) | ~$0.0079/SMS (BD) = ~0.60 BDT |
| **SMS** | Local BD Gateway | ❌ No free tier | — | ~0.30–0.50 BDT/SMS |
| **Push** | Firebase Cloud Messaging | ✅ Completely free | Unlimited | Free forever |
| **Email** | Nodemailer + Gmail SMTP | ✅ Free | 500 emails/day | Free (upgrade to SendGrid: $19.95/mo for 50K) |
| **In-App** | Socket.IO (existing) | ✅ Free (internal) | Unlimited | Free |

**Recommended Migration Path:**
1. **Launch**: Twilio trial ($15) + Meta Cloud API free tier + Firebase + Gmail SMTP
2. **Growth** (500+ SMS/mo): Swap SMS to a local Bangladesh provider (BulkSMSBD, SSL Wireless) — ~$4–7/mo for 1,000 SMS
3. **Scale** (1K+ WA convos/mo): Upgrade Meta Cloud API to paid tier — ~$5–80/mo depending on volume
4. **Scale** (5K+ emails/mo): Switch to SendGrid or AWS SES — ~$15–20/mo

---

## N. Template Registration with Meta (WhatsApp)

For WhatsApp proactive messaging, you *must* register templates with Meta Business Platform:

| Template Name | Category | Body (English) |
|---------------|----------|----------------|
| `appointment_confirmed` | UTILITY | Appointment confirmed! Ticket: {{1}}. Provider: {{2}} on {{3}}. Track: {{4}} |
| `appointment_reminder_24h` | UTILITY | Reminder: You have an appointment with {{1}} tomorrow at {{2}}. |
| `appointment_reminder_1h` | UTILITY | Reminder: {{1}} is arriving in ~1 hour. ETA: {{2}}. Track: {{3}} |
| `assignment_created` | UTILITY | New assignment: Patient {{1}}, {{2}} service at {{3}}. Address: {{4}} |
| `report_finalized` | UTILITY | Report ready for {{1}}. Download: {{2}} |
| `invoice_generated` | UTILITY | Invoice #{{1}}: {{2}} BDT. Pay here: {{3}}. Due: {{4}} |
| `invoice_overdue` | UTILITY | Reminder: Invoice #{{1}} of {{2}} BDT is overdue. Pay now: {{3}} |
| `emergency_alert` | UTILITY | EMERGENCY: Patient {{1}} at {{2}}. Location: {{3}}. Immediate attention required. |
| `provider_dispatched` | UTILITY | {{1}} is on the way! ETA: {{2}}. Track live: {{3}} |
| `provider_arrived` | UTILITY | {{1}} has arrived at your location. |
| `prescription_ready` | UTILITY | Your prescription from Dr. {{1}} is ready. View: {{2}} |
| `diet_plan_ready` | UTILITY | Your diet plan from {{1}} is ready. View: {{2}} |
| `followup_reminder` | UTILITY | Reminder: Follow-up appointment with {{1}} in 2 days. Book: {{2}} |

---

## O. Error Handling & Reliability

| Scenario | Handling |
|----------|----------|
| Provider API timeout (5s) | Catch → set log to FAILED → queue for retry |
| Invalid phone number | Log as FAILED with error, do not retry |
| Meta template not approved | Log as FAILED with reason, alert admin via email |
| Rate limit exceeded | Exponential backoff, retry after `Retry-After` header |
| Duplicate send | Check `notification_logs` for same trigger + recipient within last 5 min |
| SMS provider down | Failover to secondary SMS provider (if configured) |
| Webhook delivery | Acknowledge immediately (200), process asynchronously |

---

## P. Logging & Monitoring

- Use NestJS built-in Logger: `new Logger('NotificationService')`
- Log at every step: `send()`, `renderTemplate()`, provider call, webhook receipt
- Track metrics:
  - `notification.sent.count` — total sent
  - `notification.delivered.count` — confirmed delivered
  - `notification.failed.count` — failed + reason breakdown
  - `notification.avg.latency` — time from send to delivery receipt
- Admin dashboard can display these metrics from `notification_logs` table

---

## Q. Security Considerations

- All provider API keys stored in `.env` only, never committed
- WhatsApp webhook verify token is a random string, rotated periodically
- Twilio status callback validates Twilio signature header
- Device tokens are stored per-user, accessible only by that user
- Notification preferences are user-scoped — users can only modify their own
- Admin endpoints require role-based guard (`@Roles('admin')`)
- Bulk retry endpoint rate-limited to prevent provider abuse
- Message bodies are never logged in plain text outside `notification_logs`
- PII (phone, email) in logs is denormalised but access-controlled

---

## R. Testing Strategy

### Unit Tests
| File | Tests |
|------|-------|
| `template.processor.spec.ts` | Render with valid placeholders, missing placeholders, empty context, special characters |
| `notification.service.spec.ts` | Send flow, preference check, log creation, retry logic |
| `whatsapp-cloud.provider.spec.ts` | API call construction, response parsing, error handling |
| `sms-twilio.provider.spec.ts` | Message creation, status callback parsing |
| `push-fcm.provider.spec.ts` | Multicast delivery, token retrieval |
| `email.provider.spec.ts` | SMTP transport, attachment handling |

### E2E Tests
| Test | Description |
|------|-------------|
| Create template → verify in DB | Full CRUD cycle |
| Send test SMS → verify log | End-to-end with mocked provider |
| WhatsApp webhook delivery receipt → verify log update | Simulate Meta callback |
| Preference opt-out → verify no send | Ensure preferences respected |
| Retry failed notification → verify new attempt | Retry processor flow |

---

## S. Rollout Plan

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 1: Core Engine** | Week 1 | Prisma models + seed + NestJS module + service + all providers + gateway |
| **Phase 2: Scheduling** | Week 1 (overlap) | Cron jobs for all 5 reminder types |
| **Phase 3: Integration** | Week 2 | REST API + MBBS wiring (4 TODO points) |
| **Phase 4: Frontend** | Week 2 | Notification bell, admin page, preferences page, toast system, FCM |
| **Phase 5: DevOps** | Week 3 | Twilio setup, Meta Business setup, webhook config, testing, deployment |

Total: **~3 weeks** for full delivery, **~2 weeks** for core engine (Phases 1-3)
