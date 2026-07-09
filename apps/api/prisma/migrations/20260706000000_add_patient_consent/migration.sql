-- AlterTable: add patient_consent column to doctor_patient_assignments

ALTER TABLE "doctor_patient_assignments" ADD COLUMN "patient_consent" VARCHAR(10);
