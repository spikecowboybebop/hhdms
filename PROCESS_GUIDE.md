# Process Guide — How the System Works

This document explains how the HHDMS platform works from the perspective of the people who use it: patients, doctors, and call center staff. No technical knowledge required.

---

## 1. Booking a Doctor Visit

### What happens

1. A **call center agent** creates a booking for a patient and assigns an MBBS doctor.
2. The **patient** receives a notification on their phone: "A doctor has been assigned to you."
3. The **doctor** logs into the web dashboard and sees the patient in their list.

> The system sends these notifications automatically. The patient does not need to do anything to receive them beyond having the app installed and being logged in.

---

## 2. The Three-Stage Visit (Not Visited → Arriving → Arrived)

This is how the system tracks whether the doctor and patient have connected in person.

### Stage 1: Not Visited

- The patient appears in the doctor's patient list with a **gray "Not Visited"** badge.
- The doctor can view the patient's information but cannot start the consultation yet.

### Stage 2: Arriving

- The doctor clicks **"Visit Patient"** on the web dashboard.
- The patient's phone immediately receives a notification: **"Dr. [Name] is coming to visit you."**
- On the web dashboard, the badge turns **amber** and says "Arriving."
- The patient sees a **"Track Doctor"** button in the app. Tapping it shows the doctor's estimated arrival time on a map.

### Stage 3: Arrived

- When the estimated arrival time expires (about 60 seconds), the patient's phone automatically confirms the doctor's arrival.
- On the web dashboard, the badge turns **green** and says "Arrived."
- The consultation can now proceed — but only after the patient gives consent (see next section).

> **Why this matters:** The system blocks all medical actions (viewing full records, starting a consult, ordering tests) until the patient has arrived AND given consent. This ensures the doctor cannot access patient data or begin treatment before they are physically present.

---

## 3. Patient Consent

After the doctor has arrived, they must ask the patient for permission to begin. This is a legal/ethical safeguard.

### The consent process

1. The doctor clicks **"Ask for Consent"** (a white button with teal text).
2. The patient's phone receives a notification: the doctor is requesting consent.
3. When the patient taps the notification, a dialog box appears on their screen with two options:
   - **"Grant Consent"** (teal button) — yes, proceed with the consultation
   - **"Deny"** (teal text button) — no, I am not ready
4. This dialog appears **on top of whatever screen the patient is currently viewing** — they do not need to navigate anywhere.
5. The doctor sees the response immediately on the web dashboard:
   - **"✓ Consented"** (green) — consultation can begin
   - **"Consent Denied — Ask Again"** (orange button) — the doctor can try again later

### What happens after consent is granted

The right-side panel on the doctor's dashboard unlocks three things:
- **Full Record** — complete medical history of the patient
- **Start Consult** — begin the voice/video consultation
- **Quick Actions** — order tests, write prescriptions, refer to specialists

### What if the patient changes their mind?

If the patient denies consent, nothing is lost. The doctor sees an orange "Consent Denied — Ask Again" button and can request consent again at any time.

---

## 4. How Notifications Reach the Phone

There are two safety nets to ensure patients never miss a notification:

### Path 1: Push Notification (Instant)

- When something happens (doctor assigned, doctor on the way, consent requested), the server sends a push notification directly to the patient's phone.
- This arrives immediately as a notification in the phone's notification bar, just like WhatsApp or any other app.

### Path 2: App Polling (Backup)

- Every 15 seconds, the app automatically checks the server for any notifications it might have missed.
- This ensures that even if the push notification fails (phone was offline, notification was dismissed, etc.), the patient will still see it within 15 seconds when they open the app.

> **Result:** Patients can step away from the app and still receive alerts. When they return, any missed notifications will be waiting for them in the app's notification list.

---

## 5. Real-Time Dashboard Updates

When a doctor is using the web dashboard, the patient list updates automatically — no page refresh needed.

| Event | What the doctor sees |
|-------|---------------------|
| Visit started | Patient badge changes from "Not Visited" to "Arriving" |
| Patient arrived | Patient badge changes from "Arriving" to "Arrived" |
| Patient grants consent | "Waiting for consent..." changes to "✓ Consented" |
| Patient denies consent | "Waiting for consent..." changes to "Consent Denied — Ask Again" |

The right-side panel (Full Record, Start Consult, Quick Actions) enables or disables itself automatically based on the patient's current state.

---

## 6. Roles and Who Does What

| Role | Uses | Can do |
|------|------|--------|
| **Patient** | Android app | View bookings, track doctor arrival, grant/deny consent, receive notifications |
| **MBBS Doctor** | Web dashboard (desktop) | View assigned patients, start visits, request consent, view records, start consult |
| **Call Center** | Web dashboard | Create bookings, assign doctors |
| **Specialist / Caregiver / Nutritionist** | Web dashboard | Manage their respective workflows |

---

## 7. Common Questions

### Can the same phone be used by multiple people?

Yes. The app supports logging out and logging in as a different user. For example, you can log in as a patient to test booking, then log out, log in as an MBBS doctor, and test the doctor's workflow — all on the same device. Notifications and data are cleared and re-fetched for the currently logged-in user.

### What happens if a notification arrives while the app is closed?

Push notifications still appear in the phone's notification bar. When the patient taps the notification, the app opens to the relevant screen. If the patient opens the app normally (not via the notification), the 15-second polling loop will fetch any missed notifications.

### Can the doctor start the consultation before the patient arrives?

No. The system blocks all clinical actions until the patient has:
1. Confirmed arrival (tracking animation completes), **and**
2. Granted consent

Both conditions must be met.

### Can the doctor see patient records before getting consent?

No. "Full Record" is disabled until the patient has both arrived and granted consent.
