-- AlterTable: add appointment_activity column
ALTER TABLE "doctor_patient_assignments" ADD COLUMN "appointment_activity" VARCHAR(20) NOT NULL DEFAULT 'pending';
