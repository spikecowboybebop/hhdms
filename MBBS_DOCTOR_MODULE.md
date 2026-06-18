# 3.2 MBBS Doctor Module - First Call (MB)

The MBBS Doctor (First Call) performs the initial patient assessment, records clinical data, orders diagnostics, and coordinates specialist referrals. This module is the clinical gateway of the system.

### 3.2.1 Assessment & Clinical Documentation

| ID | Feature | Description | Priority | Actors | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MB-001 | Assignment Notification | Notify assigned MBBS doctor of new appointment via push notification, SMS, and in-app alert. Include patient name, address, appointment time, and call center notes. | Must Have | System, Notification Engine | Confirmed appointment event | Push notification + SMS to doctor |
| MB-002 | Patient Information View | Display full patient profile: demographics, complete medical history, current medications, known allergies, past appointments, and linked call center notes. | Must Have | MBBS Doctor | Doctor opens patient record | Comprehensive patient summary view |
| MB-003 | Vital Signs Recording | Structured vital signs form: Blood Pressure (Systolic/Diastolic mmHg), Pulse (bpm), Temperature (°C/°F), SpO2 (%), Respiratory Rate (breaths/min), Weight (kg), Height (cm). Auto-flag out-of-range values. | Must Have | MBBS Doctor | Vital signs measured at patient location | Stored vitals record with timestamp and alert if abnormal |
| MB-004 | Preliminary Diagnosis | Enter chief complaint, history of present illness, review of systems, examination findings, and preliminary diagnosis. Supports ICD-10 code lookup. | Must Have | MBBS Doctor | Clinical findings | Diagnosis record linked to patient visit |
| MB-013 | Differential Diagnosis Tool | AI-assisted differential diagnosis suggestions based on entered symptoms and vital signs. Doctor reviews and selects appropriate diagnosis. Tool is advisory only. | Should Have | System (AI Engine), MBBS Doctor | Symptom inputs, vitals | Ranked differential diagnosis list |

### 3.2.2 Test Ordering & Lab Integration

| ID | Feature | Description | Priority | Actors | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MB-005 | Diagnostic Test Ordering | Order blood tests, urine tests, ECG, and other diagnostics from a pre-configured test catalog. Supports test bundling (e.g. CBC + CMP). Tests routed to appropriate lab teams. | Must Have | MBBS Doctor | Selected tests, patient MRN | Test order record, lab team notification |
| MB-006 | Lab Requisition Slip | Auto-generate a standardized, printable lab requisition slip containing: Patient name + MRN, Test names, Ordering doctor, Date/time, unique barcode/QR code for sample tracking. | Must Have | System | Confirmed test order | PDF requisition slip, barcode generated |
| MB-007 | Lab Notification | Auto-notify patient (SMS/WhatsApp) and lab team (push/SMS) with test order details, collection instructions, and expected turnaround time. | Must Have | Notification Engine | Test order confirmed | Patient SMS, Lab team alert |
| MB-008 | Test Results View | Display completed lab results with reference ranges, trend graphs for repeat tests, and critical value highlights. Notify the doctor immediately when critical values are received. | Must Have | System, Lab Integration | Lab results uploaded | Results view with reference ranges and critical alerts |

### 3.2.3 Referral & Prescription

| ID | Feature | Description | Priority | Actors | Inputs | Outputs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MB-009 | Specialist Referral | Refer patients to one or more of 11 specialists. The system checks specialist availability by area/date and sends a referral package: MBBS notes + vitals + test results. | Must Have | MBBS Doctor | Selected specialist, referral notes | Referral record, specialist notified, appointment auto-offered |
| MB-010 | Referral Chain Tracking | Maintain and display the complete care chain: Call Center → MBBS → Tests → Specialist → Follow-up. All actors can view the chain relevant to their role. | Must Have | System | Each workflow step completion | Timeline view of patient care journey |
| MB-011 | Prescription Generation | Generate digital prescriptions with: Medication name (generic + brand), Dosage, Frequency, Duration, Route, Special instructions (with/without food, etc.). | Must Have | MBBS Doctor | Prescription inputs | Digital prescription, printable PDF |
| MB-012 | Digital Signature | Apply doctor's registered digital signature (uploaded image + credential verification) on prescriptions and referral letters. Compliant with Bangladesh Medical Practice guidelines. | Must Have | MBBS Doctor, System | Doctor digital signature on file | Signed prescription/referral PDF |
| MB-014 | Emergency Case Flag | One-click emergency flag on any patient record. Triggers priority specialist dispatch, admin alert, and emergency notation on all linked records. | Must Have | MBBS Doctor | Emergency flag trigger | Priority ticket, admin notified, specialist dispatched |
