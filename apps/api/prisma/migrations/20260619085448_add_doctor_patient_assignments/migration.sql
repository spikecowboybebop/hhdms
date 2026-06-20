-- CreateTable
CREATE TABLE "doctor_patient_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_patient_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_patient_assignments_doctor_id_patient_id_key" ON "doctor_patient_assignments"("doctor_id", "patient_id");

-- AddForeignKey
ALTER TABLE "doctor_patient_assignments" ADD CONSTRAINT "doctor_patient_assignments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor_patient_assignments" ADD CONSTRAINT "doctor_patient_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
