-- Additive only: link patient_diagnosis_reports to booking_sessions

-- AlterTable
ALTER TABLE "patient_diagnosis_reports" ADD COLUMN "booking_session_id" UUID;

-- CreateIndex
CREATE INDEX "patient_diagnosis_reports_booking_session_id_idx" ON "patient_diagnosis_reports"("booking_session_id");

-- AddForeignKey
ALTER TABLE "patient_diagnosis_reports" ADD CONSTRAINT "patient_diagnosis_reports_booking_session_id_fkey" FOREIGN KEY ("booking_session_id") REFERENCES "booking_sessions"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
