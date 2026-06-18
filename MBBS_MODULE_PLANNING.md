# MBBS Doctor Module — Detailed Implementation Plan

> **Module**: 3.2 MBBS Doctor Module - First Call (MB)
> **Date**: June 18, 2026
> **Stack**: NestJS (Backend) + Next.js 16 (Frontend) + Prisma/PostgreSQL (Data)

---

## 1. Feature Breakdown & Implementation Status

| Feature ID | Feature Name | Priority | Backend | Frontend | Dependencies |
|---|---|---|---|---|---|
| MB-001 | Assignment Notification | Must Have | ⚠️ Stub | ⚠️ Stub | Notification Engine (not built) |
| MB-002 | Patient Information View | Must Have | ✅ Build | ✅ Build | Patient Management Module (partial) |
| MB-003 | Vital Signs Recording | Must Have | ✅ Build | ✅ Build | None |
| MB-004 | Preliminary Diagnosis (ICD-10) | Must Have | ✅ Build | ✅ Build | None |
| MB-005 | Diagnostic Test Ordering | Must Have | ✅ Build | ✅ Build | Diagnostic Services Module (partial) |
| MB-006 | Lab Requisition Slip | Must Have | ✅ Build | ✅ Build | None |
| MB-007 | Lab Notification | Must Have | ⚠️ Stub | ⚠️ Stub | Notification Engine (not built) |
| MB-008 | Test Results View | Must Have | ✅ Build | ✅ Build | Diagnostic Services Module (partial) |
| MB-009 | Specialist Referral | Must Have | ✅ Build | ✅ Build | Scheduling Module (partial) |
| MB-010 | Referral Chain Tracking | Must Have | ✅ Build | ✅ Build | None |
| MB-011 | Prescription Generation | Must Have | ✅ Build | ✅ Build | None |
| MB-012 | Digital Signature | Must Have | ✅ Build | ✅ Build | None |
| MB-013 | Differential Diagnosis Tool | Should Have | ⚠️ Stub | ⚠️ Stub | AI Engine (not built) |
| MB-014 | Emergency Case Flag | Must Have | ✅ Build | ✅ Build | None |

✅ = Fully implemented | ⚠️ = Stubbed with comments for future integration

---

## 2. Database Schema (Prisma) — New Models

### 2.1 Models to Add

```
patients                    — Core patient demographics & medical history
patient_vital_signs         — Vital signs records per visit
icd10_codes                 — ICD-10 code lookup catalog
patient_diagnoses           — Diagnosis records linked to visits
diagnostic_test_catalog     — Available test catalog
diagnostic_test_orders      — Test orders placed by MBBS doctor
diagnostic_test_results     — Lab results uploaded against orders
specialist_referrals        — Referral records to specialists
prescriptions               — Digital prescriptions
prescription_medications    — Individual medications in a prescription
emergency_flags             — Emergency case flags
referral_chain              — Timeline of patient care journey
```

### 2.2 Relationships

- `patients` → `patient_vital_signs` (1:N)
- `patients` → `patient_diagnoses` (1:N)
- `patients` → `diagnostic_test_orders` (1:N)
- `patients` → `specialist_referrals` (1:N)
- `patients` → `prescriptions` (1:N)
- `patients` → `emergency_flags` (1:N)
- `patients` → `referral_chain` (1:N)
- `mbbs_doctor_profiles` → `patient_vital_signs` (1:N)
- `mbbs_doctor_profiles` → `patient_diagnoses` (1:N)
- `mbbs_doctor_profiles` → `diagnostic_test_orders` (1:N)
- `mbbs_doctor_profiles` → `prescriptions` (1:N)
- `diagnostic_test_orders` → `diagnostic_test_results` (1:N)
- `prescriptions` → `prescription_medications` (1:N)

---

## 3. Backend API Endpoints

### 3.1 Module: `MbbsModule`

**Base Path**: `/api/mbbs`

| Method | Endpoint | Feature | Auth |
|---|---|---|---|
| GET | `/patients` | List assigned patients | MBBS_DOCTOR |
| GET | `/patients/:id` | Patient full profile (MB-002) | MBBS_DOCTOR |
| POST | `/patients/:id/vitals` | Record vital signs (MB-003) | MBBS_DOCTOR |
| GET | `/patients/:id/vitals` | Get vital signs history | MBBS_DOCTOR |
| POST | `/patients/:id/diagnoses` | Create diagnosis (MB-004) | MBBS_DOCTOR |
| GET | `/patients/:id/diagnoses` | Get diagnosis history | MBBS_DOCTOR |
| GET | `/icd10/search?q=` | Search ICD-10 codes (MB-004) | MBBS_DOCTOR |
| GET | `/tests/catalog` | List diagnostic test catalog (MB-005) | MBBS_DOCTOR |
| POST | `/patients/:id/test-orders` | Order diagnostic tests (MB-005) | MBBS_DOCTOR |
| GET | `/patients/:id/test-orders` | Get test orders (MB-005) | MBBS_DOCTOR |
| GET | `/test-orders/:id/requisition` | Generate lab requisition PDF (MB-006) | MBBS_DOCTOR |
| GET | `/patients/:id/test-results` | View test results (MB-008) | MBBS_DOCTOR |
| POST | `/patients/:id/referrals` | Create specialist referral (MB-009) | MBBS_DOCTOR |
| GET | `/patients/:id/referrals` | Get referral history (MB-009) | MBBS_DOCTOR |
| GET | `/patients/:id/referral-chain` | Get care chain timeline (MB-010) | MBBS_DOCTOR |
| POST | `/patients/:id/prescriptions` | Generate prescription (MB-011) | MBBS_DOCTOR |
| GET | `/patients/:id/prescriptions` | Get prescription history | MBBS_DOCTOR |
| POST | `/patients/:id/emergency-flag` | Set emergency flag (MB-014) | MBBS_DOCTOR |
| GET | `/patients/:id/emergency-flags` | Get emergency flag history | MBBS_DOCTOR |
| GET | `/schedule` | Get doctor's schedule/assignments | MBBS_DOCTOR |

### 3.2 Files to Create

```
apps/api/src/
  mbbs/
    mbbs.module.ts
    mbbs.controller.ts
    mbbs.service.ts
    dto/
      create-vitals.dto.ts
      create-diagnosis.dto.ts
      create-test-order.dto.ts
      create-referral.dto.ts
      create-prescription.dto.ts
      create-emergency-flag.dto.ts
```

---

## 4. Frontend Pages & Components

### 4.1 Pages

| Route | Description |
|---|---|
| `/dashboard/mbbs` | Main triage dashboard (enhance existing) |
| `/dashboard/mbbs/patients` | Patient list & search |
| `/dashboard/mbbs/patients/[id]` | Patient detail with full clinical workflow |
| `/dashboard/mbbs/patients/[id]/vitals` | Vital signs recording form |
| `/dashboard/mbbs/patients/[id]/diagnosis` | Diagnosis & ICD-10 lookup |
| `/dashboard/mbbs/patients/[id]/tests` | Test ordering & results |
| `/dashboard/mbbs/patients/[id]/prescriptions` | Prescription generation |
| `/dashboard/mbbs/patients/[id]/referral` | Specialist referral workflow |
| `/dashboard/mbbs/schedule` | Doctor's schedule view |

### 4.2 Components to Create

```
apps/web/components/mbbs/
  patient-list.tsx           — Searchable patient list
  patient-header.tsx         — Patient demographic header card
  vitals-form.tsx            — Structured vital signs input form
  vitals-display.tsx         — Vital signs read-only display with alerts
  diagnosis-form.tsx         — Chief complaint, HPI, ROS, exam findings
  icd10-search.tsx           — ICD-10 code search combobox
  test-catalog.tsx           — Test catalog browser with bundling
  test-order-form.tsx        — Test selection & ordering
  test-results-viewer.tsx    — Lab results with reference ranges
  prescription-form.tsx      — Medication entry form
  prescription-preview.tsx   — Digital prescription preview
  referral-form.tsx          — Specialist selection & referral notes
  referral-chain-timeline.tsx — Care journey timeline
  emergency-flag-button.tsx  — One-click emergency flag
  schedule-calendar.tsx      — Doctor's schedule view
```

### 4.3 Design System (from existing landing page)

- **Colors**: `clinical-navy` (#0A2540), `tech-teal` (#00D4B2), `slate-gray` (#2D3A4A), `soft-slate` (#F8F9FA), `alert-amber` (#FF9900)
- **Typography**: Geist Sans (headings), Geist Mono (codes/IDs)
- **Components**: Reuse `DashboardShell`, `SectionCard`, `StatCard` from existing dashboard
- **Pattern**: Rounded-xl/2xl borders, subtle shadows, border-slate-200/60, hover transitions

---

## 5. Implementation Order

1. **Prisma Schema** — Add all new models
2. **Backend DTOs** — Create validation DTOs
3. **Backend Service** — Implement business logic
4. **Backend Controller** — Wire up endpoints
5. **Backend Module** — Register in AppModule
6. **Frontend Components** — Build reusable MBBS components
7. **Frontend Pages** — Wire up routes with components
8. **Integration** — Connect frontend to backend API

---

## 6. Stubbed Integrations (Comments Only)

The following features will have stub endpoints/comments because their dependent modules don't exist yet:

- **MB-001**: `// TODO: Integrate with Notification Engine (Module 3.13) for push/SMS alerts`
- **MB-007**: `// TODO: Integrate with Notification Engine (Module 3.13) for lab notifications`
- **MB-009 (availability check)**: `// TODO: Integrate with Scheduling & Dispatch Module (Module 3.10) for specialist availability`
- **MB-013**: `// TODO: Integrate with AI Engine for differential diagnosis suggestions`
- **GPS tracking**: `// TODO: Integrate with Live GPS Tracking Module (Module 3.8) for provider ETA`
- **Billing**: `// TODO: Integrate with Billing & Payment Module (Module 3.11) for invoice generation`