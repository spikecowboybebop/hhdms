# HHDMS — End-to-End Workflows

This document describes the key end-to-end workflows that span the NestJS API, Next.js web dashboard, and Android patient app.

---

## 1. Three-State Visit Tracking

Tracks a patient's physical arrival at the doctor's location through three states, synchronized in real-time to the web dashboard.

### States

| State | Badge (Web) | Meaning |
|-------|-------------|---------|
| `"pending"` (default) | Gray "Not Visited" | Patient assigned, doctor has not started the visit |
| `"arriving"` | Amber "Arriving" | Doctor pressed "Visit Patient" — patient notified via FCM |
| `"arrived"` | Green "Arrived" | Patient's device finished tracking animation, confirmed arrival |

### Flow

```
  Doctor (Web)                API Server                Patient (Android)
      │                          │                            │
      ├── Click "Visit Patient"  │                            │
      │ ──────────────────────►  │                            │
      │                          ├── persist appointment_activity = 'arriving'
      │                          ├── send FCM push (type: doctor_coming, patient_id)
      │                          ├── emit Socket.IO visit_state_changed({state:'arriving'})
      │ ◄─── state updates ──────┤                            │
      │                          │     ┌── receive FCM push ──┤
      │                          │     │                      ├── save patient_id to VisitStorage
      │                          │     │                      ├── show "Doctor on the Way" notification
      │                          │     │                      ├── "Track Doctor" button appears
      │                          │     │                      │
      │                          │     │    ┌── Tap Track Doctor
      │                          │     │    │
      │                          │     ├────┼──► DoctorTrackingScreen (60s ETA animation)
      │                          │     │    │
      │                          │     │    └── Animation complete ──►
      │                          │ ◄───┼─────────────────────────┤
      │                          │     │   POST /mbbs/patients/:id/mark-arrived
      │                          ├── find assignment by patient_id
      │                          ├── update appointment_activity = 'arrived'
      │                          ├── emit Socket.IO visit_state_changed({state:'arrived'})
      │ ◄─── state updates ──────┤                            │
      │ (badge turns green)      ├── ✓ Consented can now be requested
```

### Key Files

- **API:** `apps/api/src/mbbs/mbbs.service.ts` — `startPatientVisit()`, `markArrived()`
- **API:** `apps/api/src/mbbs/mbbs.controller.ts` — `POST /patients/:id/mark-arrived`
- **API:** `apps/api/src/mbbs/visit.gateway.ts` — Socket.IO `/visit` namespace
- **Android:** `DoctorTrackingScreen.kt` — calls `markArrived` on animation complete
- **Android:** `MainActivity.kt` — polling loop, `VisitStorage`, state management
- **Web:** `apps/web/app/dashboard/mbbs/page.tsx` — Socket.IO client, state badge UI

### Important

- `markArrived` does **not** use the caller's JWT user ID — the assignment is found by `patient_id` only, because the patient's device calls this endpoint.
- `VisitStorage` (SharedPreferences on Android) persists the `patient_id` across activity restarts so the tracking screen always knows which patient to confirm arrival for.

---

## 2. Patient Consent Flow

After the patient has arrived, the doctor must obtain the patient's explicit consent before starting the consultation. The web dashboard gates all clinical actions until consent is granted.

### States

| State | Web UI | Meaning |
|-------|--------|---------|
| `null` | "Ask for Consent" (white/teal pill) | Consent not yet requested |
| `"pending"` | "Waiting for consent..." (amber) | Request sent, waiting for patient |
| `"denied"` | "Consent Denied — Ask Again" (orange pill) | Patient denied, can retry |
| `"granted"` | "✓ Consented" (green) | Patient granted consent |

### Flow

```
  Doctor (Web)                API Server                Patient (Android)
      │                          │                            │
      ├── (patient arrived)     │                            │
      ├── Click "Ask for Consent"│                            │
      │ ──────────────────────►  │                            │
      │   POST /mbbs/patients/:id/request-consent            │
      │                          ├── set patient_consent = 'pending'
      │                          ├── send FCM push (type: consent_request, patient_id)
      │                          ├── emit Socket.IO visit_state_changed({patient_consent:'pending'})
      │ ◄─── "Waiting..." ───────┤                            │
      │                          │                            │
      │                          │     ┌── receive FCM push ──┤
      │                          │     │   (or see notification in polling loop)
      │                          │     │                      ├── show notification
      │                          │     │                      ├── tap notification ──► consent dialog
      │                          │     │                      │
      │                          │     │    ┌── tap "Grant Consent" / "Deny"
      │                          │     │    │
      │                          │ ◄───┼────┼─────────────────┤
      │                          │     │    │ POST /mbbs/patients/:id/respond-consent
      │                          │     │    │ { answer: "granted" | "denied" }
      │                          ├── update patient_consent
      │                          ├── emit Socket.IO visit_state_changed({patient_consent:'granted'|'denied'})
      │ ◄─── state updates ──────┤                            │
      │ (✓ Consented / Ask Again)│                            │
```

### Clinical Action Gating

The right-side panel on the web MBBS dashboard uses this single condition for all actions:

```typescript
appointment_activity === 'arrived' && patient_consent === 'granted'
```

When this is false:
- **Full Record** — disabled with tooltip explaining why
- **Start Consult** — shows "Waiting for Arrival" or "Awaiting Consent"
- **Quick Actions** — shows muted message with explanation
- **API guard** — `ensurePatientArrived()` in `mbbs.service.ts` returns `ForbiddenException` if not `arrived` + `granted`

### Key Files

- **API:** `apps/api/src/mbbs/mbbs.service.ts` — `requestConsent()`, `respondConsent()`, `ensurePatientArrived()`
- **API:** `apps/api/src/mbbs/mbbs.controller.ts` — `POST /patients/:id/request-consent`, `POST /patients/:id/respond-consent`
- **Android:** `MainActivity.kt` — consent dialog composable overlays all screens
- **Android:** `HhdmsFirebaseMessagingService.kt` — handles `consent_request` FCM type, passes `consent_patient_id` via intent
- **Web:** `apps/web/app/dashboard/mbbs/page.tsx` — consent buttons in patient cards, gated right panel
- **Web:** `apps/web/lib/mbbs-api.ts` — `Patient.patient_consent` field, `requestConsent()` function
- **Schema:** `prisma/schema.prisma` — `doctor_patient_assignments.patient_consent`

### Important

- If consent is denied, the doctor can re-ask (button becomes "Consent Denied — Ask Again").
- The consent dialog on Android overlays **any** screen (it is placed outside the `when(currentScreen)` block in `MainActivity.kt`).
- The consent intent uses `FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_SINGLE_TOP` (not `CLEAR_TOP`) to avoid recreating and logging out the activity.

---

## 3. Push Notification Architecture

Notifications flow through two parallel paths to ensure delivery: **direct FCM push** and **polling loop**.

### Notification Types

| Type | Trigger | Recipient | Contains |
|------|---------|-----------|----------|
| `provider_assigned` | Booking session created | Patient | `session_id`, `patient_id` |
| `doctor_coming` | Doctor clicks "Visit Patient" | Patient | `patient_id` |
| `consent_request` | Doctor clicks "Ask for Consent" | Patient | `patient_id` |

### Delivery Paths

```
  sendToUser() called
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
  Persist to DB                          Send FCM push
  (server_notifications)                 (immediate, best-effort)
  delivered = false                             │
         │                                       │
         │                                       ├── success → delivered to device
         │                                       └── failure → token cleaned up
         │
  ┌──────┘
  ▼
  Polling loop (Android, every 15s)
         │
         ├── GET /notifications/pending
         │
         ├── API marks notifications as delivered = true
         │
         └── Android shows in-app notification + Toast (for provider_assigned)
```

The two paths are deliberately redundant:
1. **FCM push** delivers immediately but may fail (device offline, token expired, etc.)
2. **Polling loop** serves as a reliable fallback — always polls when the app is on a dashboard screen

### Token Registration

```
  Android App                           API Server
      │                                     │
      ├── onAuthSuccess                    │
      ├── every polling cycle start        │
      ├── on cold start (existing token)   │
      │                                     │
      ├── POST /notifications/register-token
      │  { token: "<fcm_token>" }          │
      │                                     │
      │                                     ├── upsert [user_id, token]
      │                                     ├── delete stale entries (same token, different user)
      │                                     ├── subscribe to role topic
      │                                     └── flush any pending undelivered
      │                                         notifications via FCM
```

### Key Files

- **API:** `apps/api/src/notifications/notifications.service.ts` — `sendToUser()`, `getPendingNotifications()`, `flushUndelivered()`, `sendFcmPush()`, `registerToken()`
- **Android:** `MainActivity.kt` — 15s polling loop in `LaunchedEffect(sessionLoadKey)`
- **Android:** `HhdmsFirebaseMessagingService.kt` — `onMessageReceived()` dispatches by type
- **Android:** `NetworkService.kt` — Retrofit endpoints for notifications

### Important

- `flushUndelivered()` does **not** mark notifications as delivered — only `getPendingNotifications()` (polling loop) owns the delivered flag. This ensures the polling loop serves as a reliable fallback.
- Server logs use the `[NOTIFICATION]` prefix for tracing.
- FCM topic subscription maps roles to topics: `mbbs_doctor` / `mbbs` → `mbbs_doctors`, `specialist` → `specialists`, `caregiver` → `caregivers`, `nutritionist` → `nutritionists`.

---

## 4. Real-Time Updates (Socket.IO)

The web dashboard receives live updates without page refresh via Socket.IO.

### Connection

```
Web Dashboard                  API Server (Socket.IO)
      │                              │
      ├── io("<apiUrl>/visit", {     │
      │     auth: { token },         │
      │     transports: ["websocket",│
      │       "polling"]             │
      │   })                         │
      │                              │
      │                              ├── JWT verification on handshake
      │                              ├── Join room: doctor:{userId}
      │                              └── Handle disconnection
```

### Events

| Event | Payload | When |
|-------|---------|------|
| `visit_state_changed` | `{ patientId, state, patient_consent? }` | Visit state or consent changes |

The `VisitGateway` (`apps/api/src/mbbs/visit.gateway.ts`) exposes a single method:

```typescript
emitVisitStateChanged(
  doctorUserId: string,
  patientId: string,
  state: string,
  extra?: Record<string, any>,  // e.g., { patient_consent: "granted" }
)
```

This method is called by `MbbsService` whenever:
- `startPatientVisit()` emits `{ state: 'arriving' }`
- `markArrived()` emits `{ state: 'arrived' }`
- `requestConsent()` emits `{ state: 'arrived', patient_consent: 'pending' }`
- `respondConsent()` emits `{ state: 'arrived', patient_consent: 'granted'|'denied' }`

### Key Files

- **API:** `apps/api/src/mbbs/visit.gateway.ts` — Server-side Socket.IO gateway
- **API:** `apps/api/src/mbbs/mbbs.module.ts` — `VisitGateway` registered in providers + exports
- **Web:** `apps/web/app/dashboard/mbbs/page.tsx` — Client-side Socket.IO connection + state merge

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     monorepo (hhdms/)                    │
│                                                          │
│  ┌─────────────────────┐    ┌─────────────────────────┐  │
│  │    apps/api         │    │    apps/web             │  │
│  │  NestJS 11          │    │  Next.js 16             │  │
│  │  CommonJS           │    │  ESM                    │  │
│  │  Prisma + Neon/Postgres│  │  Tailwind CSS v4       │  │
│  │  Passport JWT       │    │  socket.io-client       │  │
│  │  Socket.IO          │    │  App Router             │  │
│  │  Firebase Admin SDK │    │                         │  │
│  └────────┬────────────┘    └────────┬────────────────┘  │
│           │                          │                    │
│           │     ┌──────────────┐     │                    │
│           └─────┤  packages/   ├─────┘                    │
│                 │  ui/         │                          │
│                 │  eslint-config                           │
│                 │  typescript-config                       │
│                 └──────────────┘                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Android App (separate repo)                  │
│  /Users/mehrab/Documents/299/android_app/                 │
│                                                          │
│  Jetpack Compose                                        │
│  Retrofit (REST client)                                 │
│  socket.io-client (signaling)                           │
│  Firebase Cloud Messaging                               │
│  Agora RTC (voice/video calls)                          │
│                                                          │
│  Package: com.example.hhdmspatientapp                   │
│  Min SDK: 24, Target: 36                                │
└─────────────────────────────────────────────────────────┘
```

### Key Conventions

- The `api` workspace uses CommonJS (`module: "nodenext"`); `web` and `ui` use ESM. Never mix module systems across boundaries.
- Single TypeScript version (5.9.2) enforced at root.
- Package manager is npm (not pnpm/yarn).
- Task dependency cascade via Turborepo: `build` → `^build`, `lint` → `^lint`, `check-types` → `^check-types`.
- `.env` files are tracked in git for `apps/api`.
- API uses global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.

---

## 6. Database Schema (Key Tables)

### `doctor_patient_assignments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `doctor_id` | UUID (FK → `mbbs_doctor_profiles.user_id`) | |
| `patient_id` | UUID (FK → `patients.id`) | |
| `assigned_at` | Timestamptz | |
| `appointment_activity` | Varchar(20) | `"pending"` \| `"arriving"` \| `"arrived"` |
| `patient_consent` | Varchar(10) | `null` \| `"pending"` \| `"granted"` \| `"denied"` |

### `server_notifications`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID (FK → `users.id`) | |
| `title` | Varchar(255) | |
| `body` | Text | |
| `session_id` | UUID | For `provider_assigned` type |
| `type` | Varchar(50) | `"doctor_coming"` \| `"provider_assigned"` \| `"consent_request"` |
| `patient_id` | Varchar(50) | Links notification to a specific patient |
| `delivered` | Boolean | Default false; set true by polling loop |
| `created_at` | Timestamptz | |
