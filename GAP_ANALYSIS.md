# HHDMS Gap Analysis — SRS vs. Implementation

> Generated from the Software Requirements Specification (Home Healthcare System.docx.pdf)
> compared against the actual codebase in `hhdms/` and `android_app/`.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total SRS Features | 159 |
| Fully Implemented | ~55 (35%) |
| Partially Implemented | ~40 (25%) |
| Not Implemented | ~64 (40%) |

The codebase is **strongest** in core clinical workflows (patient records, MBBS consultation, specialist referrals, DICOM viewer, nutritionist module, caregiver core features) and **weakest** in operational/enterprise features (GPS tracking, billing, scheduling, reporting, admin tools, notifications, DevOps).

---

## 1. CALL CENTER MODULE (CC-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| CC-001 | Incoming Call Popup | Must | **IMPLEMENTED** | Caller ID lookup + patient match in call-center page |
| CC-002 | New Patient Registration | Must | **IMPLEMENTED** | Patient registration modal with full demographics |
| CC-003 | Multi-Service Booking | Must | **IMPLEMENTED** | 10+ service types from call-center interface |
| CC-004 | Call Log Management | Must | **NOT IMPLEMENTED** | No call log recording, no CDR integration |
| CC-005 | Urgent Call Forward | Must | **NOT IMPLEMENTED** | No call transfer to MBBS doctor |
| CC-006 | Unique Service Ticket | Must | **IMPLEMENTED** | Auto-generated ticket IDs |
| CC-007 | SMS Confirmation | Must | **NOT IMPLEMENTED** | No SMS gateway integration |
| CC-008 | Real-Time Provider Availability | Must | **PARTIAL** | Provider list exists but no real-time slot availability |
| CC-009 | Call Queue Management | Must | **PARTIAL** | Queue UI exists with mock data, no real queue engine |
| CC-010 | Emergency Alert Protocol | Must | **NOT IMPLEMENTED** | No emergency symptom detection or rapid dispatch |
| CC-011 | WhatsApp Integration | Should | **NOT IMPLEMENTED** | No WhatsApp Business API integration |
| CC-012 | Call Recording & Playback | Must | **NOT IMPLEMENTED** | No telecom API integration for recording |

**Module: 5/12 implemented, 2 partial, 5 missing**

---

## 2. MBBS DOCTOR MODULE (MB-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| MB-001 | Assignment Notification | Must | **IMPLEMENTED** | FCM push + in-app notification |
| MB-002 | Patient Information View | Must | **IMPLEMENTED** | Full patient profile with medical history |
| MB-003 | Vital Signs Recording | Must | **IMPLEMENTED** | Structured form with auto-flag abnormal values |
| MB-004 | Preliminary Diagnosis (ICD-10) | Must | **IMPLEMENTED** | ICD-10 search + diagnosis entry |
| MB-005 | Diagnostic Test Ordering | Must | **IMPLEMENTED** | Test catalog + ordering workflow |
| MB-006 | Lab Requisition Slip (PDF + barcode) | Must | **PARTIAL** | Test order data exists, no PDF generation or barcode/QR |
| MB-007 | Lab Notification | Must | **NOT IMPLEMENTED** | No SMS/WhatsApp notification to patient or lab team |
| MB-008 | Test Results View | Must | **PARTIAL** | Test orders exist but no results entry/view with reference ranges |
| MB-009 | Specialist Referral | Must | **IMPLEMENTED** | Full referral workflow with specialist selection |
| MB-010 | Referral Chain Tracking | Must | **IMPLEMENTED** | `referral_chain` model tracks care steps |
| MB-011 | Prescription Generation | Must | **IMPLEMENTED** | Digital prescriptions with conditional/taper medications |
| MB-012 | Digital Signature | Must | **IMPLEMENTED** | Signature capture + storage on prescriptions |
| MB-013 | Differential Diagnosis (AI) | Should | **NOT IMPLEMENTED** | No AI engine integration |
| MB-014 | Emergency Case Flag | Must | **IMPLEMENTED** | One-click emergency flag on patient records |

**Module: 10/14 implemented, 2 partial, 2 missing**

---

## 3. SPECIALIST DOCTOR MODULE (SP-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| SP-001 | Referral Notification | Must | **IMPLEMENTED** | Specialist notified of new referrals |
| SP-002 | Complete Referral View | Must | **IMPLEMENTED** | Full referral chain + vitals + DICOM viewer |
| SP-003 | Visit or Teleconsultation | Must | **PARTIAL** | Video call exists but no visit/teleconsult toggle |
| SP-004 | Medical History View | Must | **IMPLEMENTED** | Patient history accessible in consultation page |
| SP-005 | Imaging Annotation (DICOM) | Must | **IMPLEMENTED** | Cornerstone.js viewer with arrow/rect/text annotations |
| SP-006 | Specialist Diagnosis & Plan | Must | **IMPLEMENTED** | 11 specialty templates with dynamic form rendering |
| SP-007 | Specialist Prescription (drug interactions) | Must | **IMPLEMENTED** | Drug interaction checker (120+ drug pairs) |
| SP-008 | Consultation Report (PDF) | Must | **PARTIAL** | Report saved to DB, no PDF export |
| SP-009 | Follow-up Scheduling | Must | **NOT IMPLEMENTED** | No follow-up scheduling from specialist module |
| SP-010 | Additional Test Request | Must | **IMPLEMENTED** | Test ordering from specialist consultation page |
| SP-011 | Specialty Templates | Must | **IMPLEMENTED** | 16 templates across 11 specialties |
| SP-012 | Availability Calendar | Must | **NOT IMPLEMENTED** | No visual calendar for slot management |
| SP-013 | Geographic Service Area | Must | **NOT IMPLEMENTED** | No geographic area definition for specialists |
| SP-014 | Consultation Fee Display | Must | **NOT IMPLEMENTED** | No fee calculation logic |

**Module: 8/14 implemented, 3 partial, 3 missing**

---

## 4. NURSE MODULE (NS-*)

> **Critical Gap**: The Android nurse app has 15 screens with full UI, but the backend has **zero nurse endpoints**. No `NurseModule` exists in the NestJS API. No nurse-specific Prisma models. Every nurse API call returns 404.

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| NS-001 | Nurse Booking & Assignment | Must | **PARTIAL** | Android UI exists, no backend booking flow |
| NS-003 | Assigned Patient Schedule | Must | **PARTIAL** | Android screen exists, no backend endpoint |
| NS-004 | Vital Signs Recording (nurse) | Must | **PARTIAL** | Android screen exists, no backend endpoint |
| NS-005 | Medication Administration (MAR) | Must | **PARTIAL** | Android screen exists, no Prisma model or API |
| NS-006 | IV Fluid Monitoring | Must | **PARTIAL** | Android screen exists, no Prisma model or API |
| NS-007 | Wound Care Documentation | Must | **PARTIAL** | Android screen exists, no photo upload backend |
| NS-008 | Nursing Care Report (PDF) | Must | **PARTIAL** | Android screen exists, no PDF generation |
| NS-010 | Shift Handover Notes | Must | **PARTIAL** | Android screen exists, no backend endpoint |
| NS-011 | Live GPS Tracking | Must | **NOT IMPLEMENTED** | No nurse GPS tracking |
| NS-012 | Doctor Consultation Request | Must | **PARTIAL** | Android screen exists, no backend endpoint |
| NS-013 | Nursing Supply Tracking | Should | **PARTIAL** | Android screen exists, no backend endpoint |
| NS-014 | Pediatric Specific Care | Must | **PARTIAL** | Android screen exists, no backend models |

**Module: 0/12 implemented, 11 partial, 1 missing — Backend is entirely absent**

---

## 5. NUTRITIONIST MODULE (NU-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| NU-001 | Consultation Booking | Must | **IMPLEMENTED** | Booking + availability check |
| NU-002 | Medical Context Review | Must | **IMPLEMENTED** | Patient history, diagnoses, lab results |
| NU-003 | Anthropometric Recording | Must | **IMPLEMENTED** | BMI, ideal body weight, caloric needs (Miffling-St Jeor) |
| NU-004 | Customized Diet Chart | Must | **IMPLEMENTED** | Meal-slot diet plans with food items |
| NU-005 | Condition-Specific Templates | Must | **IMPLEMENTED** | Diet templates seeded (Diabetes, CKD, Heart, etc.) |
| NU-006 | Bilingual Diet Plan PDF | Must | **IMPLEMENTED** | Bengali + English PDFKit generation |
| NU-007 | Follow-up Scheduling | Must | **IMPLEMENTED** | Interval-based scheduling with auto-date |
| NU-008 | Dietary Adherence Tracking | Should | **IMPLEMENTED** | Adherence logs with scores |
| NU-009 | Nutrient Calculation Tools | Must | **IMPLEMENTED** | Food item DB + macro calculator |
| NU-010 | Patient Education Materials | Should | **IMPLEMENTED** | Upload + share via patient_documents |

**Module: 10/10 implemented — Complete**

---

## 6. CAREGIVER MODULE (CG-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| CG-001 | Caregiver Booking | Must | **PARTIAL** | Generic booking exists, no dedicated caregiver booking flow |
| CG-003 | Service Type Management | Must | **PARTIAL** | `service_type` field exists, no dedicated management |
| CG-005 | Daily Activity Logging | Must | **IMPLEMENTED** | Full CRUD with Android + API + web |
| CG-006 | GPS Shift Check-In/Out | Must | **IMPLEMENTED** | Haversine distance, lat/lng capture (web UI missing) |
| CG-007 | Condition Change Reporting | Must | **IMPLEMENTED** | Report + nurse/doctor alert system |
| CG-008 | Attendance & Timesheets | Must | **IMPLEMENTED** | Auto-generated from check-in/out (web UI missing) |
| CG-009 | Caregiver Rating & Feedback | Must | **NOT IMPLEMENTED** | `rating` field exists but no submission API |
| CG-010 | Training Records | Should | **NOT IMPLEMENTED** | `training_certs` field exists but no management API |
| CG-011 | Specialized Caregiver Booking | Must | **NOT IMPLEMENTED** | No specialization-based booking |

**Module: 4/9 implemented, 2 partial, 3 missing**

---

## 7. USG / SONOLOGY MODULE (US-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| US-001 | USG Booking | Must | **PARTIAL** | Generic booking, no dedicated USG booking |
| US-002 | Sonologist Assignment | Must | **PARTIAL** | Studies link to sonologist but no assignment workflow |
| US-003 | Referral Details View | Must | **NOT IMPLEMENTED** | No referral context for sonologist |
| US-005 | Scan Findings & Measurements | Must | **IMPLEMENTED** | Structured findings + impression entry |
| US-006 | USG Report Generation | Must | **IMPLEMENTED** | Report records with findings + impression |
| US-007 | DICOM Image Storage | Must | **PARTIAL** | Specialist DICOM exists, no sonologist-specific upload |
| US-008 | Specialist Image Annotation | Must | **PARTIAL** | `annotated_images` field exists, no interactive tool |
| US-009 | Report Delivery Notification | Must | **NOT IMPLEMENTED** | No notification on report finalization |
| US-010 | Equipment Maintenance Log | Should | **NOT IMPLEMENTED** | No equipment tracking |

**Module: 2/9 implemented, 4 partial, 3 missing**

---

## 8. PORTABLE X-RAY MODULE (XR-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| XR-001 through XR-011 | All X-Ray features | Must/Should | **NOT IMPLEMENTED** | No X-Ray module exists anywhere in the codebase |

**Module: 0/10 implemented — Entire module missing**

---

## 9. GPS TRACKING & DISPATCH (LT-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| LT-001 | GPS Location Capture (30s) | Must | **PARTIAL** | GPS captured at events only, not periodic 30s streaming |
| LT-002 | Admin Live Map Dashboard | Must | **NOT IMPLEMENTED** | No admin dashboard exists |
| LT-004 | ETA Calculation | Must | **PARTIAL** | Fixed 60s countdown animation, not real distance-based |
| LT-005 | Patient Tracking Link | Must | **NOT IMPLEMENTED** | No unique URL generation |
| LT-006 | Route History Log | Must | **NOT IMPLEMENTED** | No route storage |
| LT-007 | Route Deviation Alert | Must | **NOT IMPLEMENTED** | No deviation logic |
| LT-008 | Geofence Auto Check-In | Must | **PARTIAL** | Haversine exists but geofence incomplete (TODO in code) |
| LT-009 | Near-Arrival Alert | Must | **NOT IMPLEMENTED** | No alert logic |
| LT-010 | Manual Location Confirmation | Must | **PARTIAL** | `markArrived` exists |
| LT-011 | Service Start/Complete Timestamps | Must | **PARTIAL** | Visit states tracked, no dedicated start/complete |
| LT-012 | Visit Status Timeline | Must | **PARTIAL** | `referral_chain` exists, no dedicated timeline UI |
| LT-013 | Stationary Alert | Must | **NOT IMPLEMENTED** | No alert logic |
| LT-014 | SOS Emergency Button | Must | **NOT IMPLEMENTED** | `emergency_flags` is clinical, not SOS |
| LT-015 | Location History for Payroll | Must | **PARTIAL** | Caregiver timesheets exist |
| LT-016 | Offline GPS Caching | Must | **NOT IMPLEMENTED** | No offline caching |
| LT-017 | All-Staff Live Map (Admin) | Must | **NOT IMPLEMENTED** | No admin dashboard |
| LT-018 | Distance-Based Reimbursement | Must | **NOT IMPLEMENTED** | No distance calculation for payroll |
| LT-020 | Auto-Stop Tracking on Logout | Must | **NOT IMPLEMENTED** | No continuous tracking to stop |
| LT-021 | ETA Delay Notification | Must | **NOT IMPLEMENTED** | No delay notification |
| LT-022 | Map Integration (OSM) | Must | **IMPLEMENTED** | osmdroid + OSRM routing |
| LT-023 | Privacy Control | Must | **NOT IMPLEMENTED** | No privacy settings |
| LT-024 | Daily Movement Report | Should | **NOT IMPLEMENTED** | No report generation |

**Module: 1/21 implemented, 8 partial, 12 missing — Largest gap**

---

## 10. PATIENT MANAGEMENT (PM-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| PM-001 | Centralized Patient Database | Must | **IMPLEMENTED** | 30+ field `patients` model + CRUD API |
| PM-002 | Unique MRN (MRN-YYYY-XXXXXX) | Must | **PARTIAL** | Uses timestamp format, not YYYY-XXXXXX |
| PM-003 | Demographics & Contacts | Must | **IMPLEMENTED** | Full demographics including Bengali names |
| PM-004 | Medical History | Must | **IMPLEMENTED** | Allergies, medications, diagnoses, vitals |
| PM-005 | Service History | Must | **PARTIAL** | Previous appointments exist, no comprehensive view |
| PM-006 | Patient Portal | Must | **PARTIAL** | Android app serves as portal, no web portal |
| PM-007 | Family Account | Must | **NOT IMPLEMENTED** | No multi-patient guardian accounts |
| PM-009 | Digital Consent Forms | Must | **IMPLEMENTED** | Full consent flow with Socket.IO + Android dialog |
| PM-010 | Feedback & Complaints | Must | **NOT IMPLEMENTED** | No feedback system |

**Module: 4/9 implemented, 3 partial, 2 missing**

---

## 11. SCHEDULING & DISPATCH (SD-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| SD-001 | Centralized Scheduling Dashboard | Must | **PARTIAL** | Call-center booking exists, no dedicated scheduling view |
| SD-003 | Route Optimization | Must | **NOT IMPLEMENTED** | Random doctor assignment, no route optimization |
| SD-004 | Provider Reminders (2hr + 1hr) | Must | **NOT IMPLEMENTED** | Planned in docs, TODO in code |
| SD-005 | Cancellation & Rescheduling | Must | **NOT IMPLEMENTED** | No cancellation logic or UI |
| SD-006 | Real-Time Status Tracking | Must | **PARTIAL** | Socket.IO state changes, no comprehensive dashboard |
| SD-007 | Recurring Appointments | Must | **NOT IMPLEMENTED** | No recurring logic |
| SD-008 | Manual Admin Override | Must | **NOT IMPLEMENTED** | No admin override capability |

**Module: 0/7 implemented, 3 partial, 4 missing**

---

## 12. BILLING & PAYMENT (BP-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| BP-001 | Auto-Charge Calculation | Must | **PARTIAL** | Basic price from service type, no rule engine |
| BP-002 | Itemized Invoice (INV-YYYY-XXXXX) | Must | **NOT IMPLEMENTED** | No invoice generation |
| BP-003 | Multiple Payment Methods | Must | **NOT IMPLEMENTED** | Stripe only — no bKash, Nagad, Rocket |
| BP-004 | Payment Status Tracking | Must | **IMPLEMENTED** | `payments` model with status tracking |
| BP-005 | Digital Receipt | Must | **NOT IMPLEMENTED** | No receipt generation |
| BP-006 | Insurance Documentation | Should | **NOT IMPLEMENTED** | No insurance models |
| BP-007 | Provider Commission Tracking | Must | **NOT IMPLEMENTED** | No commission models |
| BP-008 | Financial Reports | Must | **NOT IMPLEMENTED** | No financial reports |
| BP-009 | Package Pricing | Should | **NOT IMPLEMENTED** | No package pricing |
| BP-010 | Discounts & Promotions | Should | **NOT IMPLEMENTED** | No discount/promo logic |

**Module: 1/10 implemented, 1 partial, 8 missing**

---

## 13. REPORTING & ANALYTICS (RA-*)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| RA-001 | Daily Operational Summary | Must | **NOT IMPLEMENTED** | No daily report |
| RA-002 | Doctor Performance Metrics | Must | **NOT IMPLEMENTED** | No cross-role metrics |
| RA-003 | Nurse/Caregiver Attendance | Must | **PARTIAL** | Caregiver timesheets exist, no reporting UI |
| RA-004 | Call Center KPIs | Must | **NOT IMPLEMENTED** | No KPI tracking |
| RA-005 | Patient Satisfaction | Must | **NOT IMPLEMENTED** | No satisfaction surveys |
| RA-006 | Inventory Usage | Should | **NOT IMPLEMENTED** | No inventory backend |
| RA-007 | Revenue Analytics | Must | **NOT IMPLEMENTED** | No analytics |
| RA-008 | Custom Reports | Should | **NOT IMPLEMENTED** | No report builder |

**Module: 0/8 implemented, 1 partial, 7 missing**

---

## 14. NOTIFICATION ENGINE (NF-*)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| NF-001 | Appointment Confirmed (SMS) | **NOT IMPLEMENTED** | FCM push exists, no SMS gateway |
| NF-002 | 24hr Appointment Reminder | **NOT IMPLEMENTED** | No scheduled reminders |
| NF-003 | New Assignment (Push + SMS) | **PARTIAL** | FCM push works, no SMS |
| NF-004 | Report Finalized (Push + SMS + WhatsApp) | **NOT IMPLEMENTED** | No multi-channel delivery |
| NF-005 | Invoice Generated (SMS + WhatsApp) | **NOT IMPLEMENTED** | No invoice system |
| NF-006 | WhatsApp Message Received | **NOT IMPLEMENTED** | No WhatsApp integration |
| NF-007 | Emergency Flag (Push + SMS + Email) | **PARTIAL** | FCM push only |
| NF-008 | Provider Dispatched (SMS + WhatsApp) | **NOT IMPLEMENTED** | No tracking link delivery |
| NF-009 | Provider Arrived (Push + SMS) | **NOT IMPLEMENTED** | No arrival notification |
| NF-010 | Prescription Generated (WhatsApp + Portal) | **NOT IMPLEMENTED** | No delivery channel |
| NF-011 | Diet Plan Generated (WhatsApp + Portal) | **NOT IMPLEMENTED** | No delivery channel |
| NF-012 | Follow-up Due (SMS + WhatsApp) | **NOT IMPLEMENTED** | No follow-up reminders |

**Module: 0/12 fully implemented, 2 partial — SMS/WhatsApp not integrated**

---

## 15. NON-FUNCTIONAL REQUIREMENTS

| Requirement | Status | Notes |
|-------------|--------|-------|
| MFA/OTP Authentication | **PARTIAL** | Fields exist in DB, no OTP flow implemented |
| Bengali + English Bilingual UI | **PARTIAL** | Bengali name fields + diet plan PDF, no i18n framework |
| RBAC with 10+ Roles | **PARTIAL** | JWT auth exists, no endpoint-level RolesGuard |
| Audit Logging | **NOT IMPLEMENTED** | No audit_logs model or middleware |
| Offline GPS Caching | **NOT IMPLEMENTED** | No offline support |
| Redis Caching | **NOT IMPLEMENTED** | No Redis dependency |
| Docker/Kubernetes | **NOT IMPLEMENTED** | No container configuration |
| CI/CD Pipeline | **NOT IMPLEMENTED** | No GitHub Actions or CI config |
| AES-256 Encryption at Rest | **NOT IMPLEMENTED** | No encryption layer |
| TLS 1.3 | **PARTIAL** | HTTP only for local dev (cleartext), no TLS in dev |
| Annual Penetration Testing | **NOT IMPLEMENTED** | No testing infrastructure |
| 99.5% Uptime SLA | **NOT IMPLEMENTED** | No monitoring (Datadog/New Relic) |

---

## PRIORITY GAPS — What to Build Next

### Tier 1 — Critical (Blocking core functionality)
1. **Nurse Backend Module** — 0% backend for 12 nurse features (biggest single gap)
2. **SMS Gateway Integration** — Affects 10+ notification triggers across all modules
3. **X-Ray Module** — Entirely missing (0/10 features)
4. **Invoice/Billing System** — No invoice generation, no receipt, no commission tracking
5. **Cancellation & Rescheduling** — Patients cannot cancel or reschedule appointments

### Tier 2 — High Priority (Major feature gaps)
6. **Admin Dashboard** — No admin panel, no live map, no reporting
7. **GPS Tracking Engine** — 12 of 21 features missing (SOS, route history, geofence, offline caching)
8. **Scheduling & Dispatch** — Route optimization, recurring appointments, provider reminders
9. **Financial Reports** — No revenue analytics or daily operational summaries
10. **WhatsApp Integration** — Required for 6 notification triggers

### Tier 3 — Medium Priority (Enhancement features)
11. **MFA/OTP Authentication** — Security hardening
12. **Audit Logging** — Compliance requirement
13. **Provider Availability Calendar** — Specialist scheduling
14. **Geographic Service Areas** — Specialist area-based availability
15. **Consultation Fee Calculation** — Dynamic pricing

### Tier 4 — Lower Priority (Nice-to-have)
16. Docker/Kubernetes deployment
17. CI/CD pipeline
18. Redis caching layer
19. Family accounts
20. Insurance documentation
21. Custom report builder
22. Equipment maintenance logs
23. Patient education materials (web sharing)
24. Nursing supply tracking backend
25. Caregiver rating/feedback system

---

## Module Completion Summary

| Module | Total | Implemented | Partial | Missing | % Complete |
|--------|-------|-------------|---------|---------|------------|
| Call Center (CC) | 12 | 5 | 2 | 5 | 42% |
| MBBS Doctor (MB) | 14 | 10 | 2 | 2 | 79% |
| Specialist (SP) | 14 | 8 | 3 | 3 | 64% |
| Nurse (NS) | 12 | 0 | 11 | 1 | 8% |
| Nutritionist (NU) | 10 | 10 | 0 | 0 | **100%** |
| Caregiver (CG) | 9 | 4 | 2 | 3 | 50% |
| USG/Sonology (US) | 9 | 2 | 4 | 3 | 33% |
| X-Ray (XR) | 10 | 0 | 0 | 10 | **0%** |
| GPS Tracking (LT) | 21 | 1 | 8 | 12 | 19% |
| Patient Mgmt (PM) | 9 | 4 | 3 | 2 | 56% |
| Scheduling (SD) | 7 | 0 | 3 | 4 | 21% |
| Billing (BP) | 10 | 1 | 1 | 8 | 15% |
| Reporting (RA) | 8 | 0 | 1 | 7 | 6% |
| Notification (NF) | 12 | 0 | 2 | 10 | 8% |
| **TOTAL** | **159** | **~55** | **~42** | **~62** | **~38%** |

---

*Analysis based on codebase audit of `hhdms/` (NestJS + Next.js) and `android_app/` (Jetpack Compose) as of July 2026.*
