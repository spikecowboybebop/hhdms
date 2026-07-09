-- AlterTable: add patient_id column to server_notifications for visit tracking
ALTER TABLE "server_notifications" ADD COLUMN "patient_id" VARCHAR(50);
