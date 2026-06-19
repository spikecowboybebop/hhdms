# 5. DATA ENTITIES & DATA DICTIONARY

## 5.1 Core Data Entities

| Entity | Key Attributes | Related Entities | Retention |
| --- | --- | --- | --- |
| Patient | MRN, Full Name (EN+BN), DOB, Gender, Blood Group, NID, Address (GPS), Primary Phone, Emergency Contact, Active Medications, Allergies, Chronic Conditions | MedicalRecord, Appointment, Invoice, LabReport, ImagingReport, Prescription | Lifetime of patient + 10 years |
| Doctor (MBBS) | Doctor ID, NID, BMDC Reg. No., Full Name, Phone, Email, Photo, Availability Schedule, Service Area (GPS polygon), Digital Signature | Appointment, MedicalRecord, Prescription, Referral, Commission | Duration of employment + 7 years |
| Specialist Doctor | Doctor ID, BMDC Reg. No., Specialty (enum: 11 types), Sub-specialties, Consultation Fee (home/tele), Service Area, Availability Calendar | Appointment, SpecialistReport, Prescription, Commission | Duration of employment + 7 years |
| Nurse | Nurse ID, Type (Adult/Pediatric), BNMC Reg. No., Qualifications, Skills, Shift Preference, GPS Device ID | Appointment, NursingReport, VitalSigns, InventoryLog | Duration of employment + 7 years |
| Caregiver | Caregiver ID, Gender, Experience (years), Specializations (enum), Verification Status, Training Certs, Rating | CaregiverShift, ActivityLog, Attendance, Commission | Duration of employment + 7 years |
| Nutritionist | Nutritionist ID, Qualifications, Specializations (enum: conditions), Availability, Service Area | Appointment, DietChart, FollowUpNote | Duration of employment + 7 years |
| Sonologist | Sonologist ID, Qualifications, Assigned Equipment ID(s), USG Specializations | Appointment, USGReport, ImagingStudy | Duration of employment + 7 years |
| X-Ray Technician | Tech ID, Qualifications, Radiation Safety Certificate (expiry), Assigned Machine ID(s) | Appointment, XRayReport, ImagingStudy, RadiationLog | Duration of employment + 7 years |
| Appointment | Appt ID, Ticket ID, Patient MRN, Service Type, Provider ID, Date/Time, Status (enum: 8 states), Address, Special Notes, Cancellation Reason | Patient, Provider, Invoice, ServiceTicket | 5 years |
| MedicalRecord | Record ID, Patient MRN, Visit Date, Provider ID, Chief Complaint, Vitals, Examination Findings, Diagnosis (ICD-10), Plan | Prescription, LabOrder, Referral, Patient | Lifetime + 10 years |
| LabReport | Report ID, Order ID, Patient MRN, Test Name, Result Value, Unit, Reference Range, Critical Flag, Lab Tech ID, Report Date | MedicalRecord, LabOrder, Patient | Lifetime + 10 years |
| ImagingStudy (DICOM) | Study ID, Patient MRN, Modality (USG/XR), Body Part, Study Date, Technician ID, DICOM Series UIDs, Storage URL | ImagingReport, MedicalRecord, Patient | Lifetime + 10 years |
| ImagingReport | Report ID, Study ID, Patient MRN, Findings, Impression, Annotated Images, Reporter ID, Digital Signature, Report Date | ImagingStudy, MedicalRecord, Patient | Lifetime + 10 years |
| Prescription | Rx ID, Patient MRN, Doctor ID, Visit Date, Medications (array: name, dose, frequency, duration, route, instructions), Digital Signature | MedicalRecord, Patient, Doctor | Lifetime + 10 years |
| Invoice | Invoice ID, Ticket ID, Patient MRN, Line Items (array), Subtotal, Discount, Tax, Total, Payment Status, Payment History | Appointment, Payment, Patient | 10 years (financial records) |
| ServiceTicket | Ticket ID, Patient MRN, Opening Agent, Open DateTime, Service Types, Current Status, Timeline Log (array), Closing DateTime | Patient, Appointment, Invoice, Provider | 5 years |
| GPSLog | Log ID, Provider ID, Appointment ID, Timestamp, Latitude, Longitude, Accuracy, Speed, Network Status | Provider, Appointment | 2 years (operational) |
| CallLog | Call ID, Agent ID, Caller Number, Patient MRN (if matched), Start Time, Duration, Outcome (enum), Recording URL, Ticket ID (if created) | CallCenterAgent, Patient, ServiceTicket | 90 days (recording); 2 years (metadata) |