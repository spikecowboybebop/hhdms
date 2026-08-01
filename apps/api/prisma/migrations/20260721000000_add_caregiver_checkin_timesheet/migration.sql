-- CreateTable
CREATE TABLE "caregiver_check_in_out" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caregiver_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "check_in_time" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "check_out_time" TIMESTAMPTZ(6),
    "check_in_latitude" DECIMAL(10,7),
    "check_in_longitude" DECIMAL(10,7),
    "check_out_latitude" DECIMAL(10,7),
    "check_out_longitude" DECIMAL(10,7),
    "distance_meters" DECIMAL(8,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'CHECKED_IN',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caregiver_check_in_out_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_timesheets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caregiver_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "shift_date" DATE DEFAULT CURRENT_TIMESTAMP,
    "check_in_time" TIMESTAMPTZ(6),
    "check_out_time" TIMESTAMPTZ(6),
    "total_hours" DECIMAL(5,2),
    "service_type" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caregiver_timesheets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "caregiver_check_in_out" ADD CONSTRAINT "caregiver_check_in_out_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "caregiver_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_check_in_out" ADD CONSTRAINT "caregiver_check_in_out_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_timesheets" ADD CONSTRAINT "caregiver_timesheets_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "caregiver_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_timesheets" ADD CONSTRAINT "caregiver_timesheets_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
