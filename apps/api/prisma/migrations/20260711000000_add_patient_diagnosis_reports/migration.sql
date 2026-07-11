-- CreateTable
CREATE TABLE "patient_diagnosis_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "report_type" VARCHAR(50) NOT NULL DEFAULT 'CLINICAL_CONSULTATION',
    "report_data" JSONB,
    "file_url" VARCHAR(2000) NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_size" INTEGER,
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_diagnosis_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "patient_diagnosis_reports_patient_id_idx" ON "patient_diagnosis_reports"("patient_id");

-- CreateIndex
CREATE INDEX "patient_diagnosis_reports_doctor_id_idx" ON "patient_diagnosis_reports"("doctor_id");

-- AddForeignKey
ALTER TABLE "patient_diagnosis_reports" ADD CONSTRAINT "patient_diagnosis_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_diagnosis_reports" ADD CONSTRAINT "patient_diagnosis_reports_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
