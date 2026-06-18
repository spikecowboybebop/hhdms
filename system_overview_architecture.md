# 2. SYSTEM OVERVIEW & ARCHITECTURE

## 2.1 High Level System Architecture

The HHDMS follows a three-tier architecture with a clear separation between presentation, business logic, and data layers. The system is cloud-hosted, mobile-first for field staff, and supports both online and offline operation.

| Layer | Components | Technology Recommendations |
| --- | --- | --- |
| Presentation Layer | Admin Web Dashboard, Patient Portal, Field Staff Mobile App, Call Center Interface | React.js / Next.js (Web), React Native (Mobile) |
| API / Business Logic Layer | REST API services, Authentication, Notification Engine, Scheduling Engine, GPS Engine | Python (Django/FastAPI), GraphQL optional |
| Data Layer | Relational DB (patient/operational data), Object Storage (DICOM images), Cache, Message Queue | PostgreSQL, AWS S3 / Cloudflare R2, Redis, RabbitMQ |
| Integration Layer | SMS Gateway, WhatsApp Business API, Payment Gateway, Google Maps API, DICOM Viewer | Third-party API integrations via secure webhooks / REST |
| Security Layer | API Gateway, WAF, MFA, Encryption at rest & in transit, RBAC engine | AWS API Gateway / Nginx, SSL/TLS, AES-256, JWT/OAuth2 |

## 2.2 Core Workflow Overview

All services within the HHDMS follow a unified workflow pattern:

| Step | Action | System Actor | Key Data Generated |
| --- | --- | --- | --- |
| 1 | Patient/Guardian calls the service center | Call Center Agent | Caller ID, Patient Profile, Service Ticket |
| 2 | Agent registers patient and books service | Call Center Module | MRN, Appointment ID, SMS Confirmation |
| 3 | System notifies assigned provider | Notification Engine | Push/SMS Alert to Provider |
| 4 | Provider departs; live GPS tracking activated | GPS/Tracking Module | Real-time Location, ETA |
| 5 | Patient receives live tracking link | Notification Engine | Web Tracking URL (no app needed) |
| 6 | Provider arrives; geofence auto check-in | GPS Module | Arrival Timestamp, GPS Coordinates |
| 7 | Service delivered; records entered | Service-specific Module | Consultation Notes, Vitals, Reports |
| 8 | Provider marks completion; GPS stops | GPS Module | Completion Timestamp, Visit Duration |
| 9 | Report/prescription sent to patient and referring doctor | Notification Engine | PDF Report, SMS/WhatsApp |
| 10 | Invoice generated; payment processed | Billing Module | Invoice, Payment Receipt, Commission Record |