-- CreateTable
CREATE TABLE "nurse_profiles" (
    "user_id" UUID NOT NULL,
    "nurse_type" VARCHAR(50),
    "specialization" VARCHAR(100),
    "license_number" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "nurse_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "nurse_patient_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nurse_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) DEFAULT now(),
    "status" VARCHAR(20) DEFAULT 'ACTIVE',

    CONSTRAINT "nurse_patient_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_schedule_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nurse_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "scheduled_date" DATE,
    "scheduled_time_slot" VARCHAR(20),
    "service_requirements" TEXT,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "nurse_schedule_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_vital_signs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "nurse_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) DEFAULT now(),
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "pulse_bpm" INTEGER,
    "temperature_c" DECIMAL(4,1),
    "spo2_pct" INTEGER,
    "respiratory_rate" INTEGER,
    "blood_glucose" DECIMAL(5,1),
    "notes" TEXT,
    "is_abnormal" BOOLEAN DEFAULT false,

    CONSTRAINT "nurse_vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_medication_administrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "nurse_id" UUID NOT NULL,
    "drug_name" VARCHAR(200) NOT NULL,
    "dosage" VARCHAR(100),
    "route" VARCHAR(50),
    "administered_at" TIMESTAMPTZ(6) DEFAULT now(),
    "notes" TEXT,
    "nurse_name" VARCHAR(200),

    CONSTRAINT "nurse_medication_administrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_iv_fluid_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "nurse_id" UUID NOT NULL,
    "fluid_type" VARCHAR(100),
    "rate_ml_hr" DECIMAL(6,1),
    "volume_given_ml" DECIMAL(8,1),
    "site_condition" VARCHAR(200),
    "started_at" TIMESTAMPTZ(6) DEFAULT now(),
    "stopped_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) DEFAULT 'ACTIVE',

    CONSTRAINT "nurse_iv_fluid_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_wound_care_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "nurse_id" UUID NOT NULL,
    "wound_location" VARCHAR(200),
    "wound_measurements" TEXT,
    "wound_condition" TEXT,
    "dressing_applied" TEXT,
    "healing_progress" TEXT,
    "photo_url" VARCHAR(2000),
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "recorded_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "nurse_wound_care_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_care_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "nurse_id" UUID NOT NULL,
    "visit_date" DATE DEFAULT now(),
    "vitals_summary" TEXT,
    "medications_summary" TEXT,
    "procedures_performed" TEXT,
    "patient_response" TEXT,
    "handover_notes" TEXT,
    "generated_at" TIMESTAMPTZ(6) DEFAULT now(),
    "pdf_url" VARCHAR(2000),

    CONSTRAINT "nurse_care_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_handovers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nurse_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "shift_date" DATE DEFAULT now(),
    "current_status" TEXT,
    "active_concerns" TEXT,
    "medications_due" TEXT,
    "physician_orders" TEXT,
    "patient_instructions" TEXT,
    "handed_over_by" VARCHAR(200),
    "handed_over_to" VARCHAR(200),
    "signed_at" TIMESTAMPTZ(6),
    "status" VARCHAR(20) DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "nurse_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_consultation_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nurse_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "concern_summary" TEXT,
    "current_vitals_snapshot" TEXT,
    "urgency_level" VARCHAR(20) DEFAULT 'NORMAL',
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),
    "doctor_response" TEXT,
    "responded_at" TIMESTAMPTZ(6),

    CONSTRAINT "nurse_consultation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_supply_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nurse_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "supply_name" VARCHAR(200) NOT NULL,
    "quantity_used" INTEGER DEFAULT 1,
    "unit" VARCHAR(50),
    "recorded_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "nurse_supply_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_feeding_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nurse_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "feeding_type" VARCHAR(100),
    "volume_ml" DECIMAL(6,1),
    "frequency" VARCHAR(100),
    "recorded_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "nurse_feeding_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_growth_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nurse_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "weight_kg" DECIMAL(5,2),
    "height_cm" DECIMAL(5,1),
    "head_circumference_cm" DECIMAL(4,1),
    "recorded_at" TIMESTAMPTZ(6) DEFAULT now(),
    "percentile_weight" DECIMAL(5,2),
    "percentile_height" DECIMAL(5,2),
    "percentile_head" DECIMAL(5,2),

    CONSTRAINT "nurse_growth_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurse_vaccination_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nurse_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "vaccine_name" VARCHAR(200),
    "dose_number" INTEGER,
    "administered_date" DATE,
    "next_due_date" DATE,
    "status" VARCHAR(20) DEFAULT 'COMPLETED',
    "created_at" TIMESTAMPTZ(6) DEFAULT now(),

    CONSTRAINT "nurse_vaccination_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nurse_patient_assignments_nurse_id_patient_id_key" ON "nurse_patient_assignments"("nurse_id", "patient_id");

-- AddForeignKey
ALTER TABLE "nurse_profiles" ADD CONSTRAINT "nurse_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_patient_assignments" ADD CONSTRAINT "nurse_patient_assignments_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_patient_assignments" ADD CONSTRAINT "nurse_patient_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_schedule_entries" ADD CONSTRAINT "nurse_schedule_entries_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_schedule_entries" ADD CONSTRAINT "nurse_schedule_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_vital_signs" ADD CONSTRAINT "nurse_vital_signs_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_vital_signs" ADD CONSTRAINT "nurse_vital_signs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_medication_administrations" ADD CONSTRAINT "nurse_medication_administrations_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_medication_administrations" ADD CONSTRAINT "nurse_medication_administrations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_iv_fluid_records" ADD CONSTRAINT "nurse_iv_fluid_records_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_iv_fluid_records" ADD CONSTRAINT "nurse_iv_fluid_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_wound_care_records" ADD CONSTRAINT "nurse_wound_care_records_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_wound_care_records" ADD CONSTRAINT "nurse_wound_care_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_care_reports" ADD CONSTRAINT "nurse_care_reports_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_care_reports" ADD CONSTRAINT "nurse_care_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_handovers" ADD CONSTRAINT "nurse_handovers_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_handovers" ADD CONSTRAINT "nurse_handovers_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_consultation_requests" ADD CONSTRAINT "nurse_consultation_requests_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_consultation_requests" ADD CONSTRAINT "nurse_consultation_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_supply_usage" ADD CONSTRAINT "nurse_supply_usage_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_supply_usage" ADD CONSTRAINT "nurse_supply_usage_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_feeding_logs" ADD CONSTRAINT "nurse_feeding_logs_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_feeding_logs" ADD CONSTRAINT "nurse_feeding_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_growth_records" ADD CONSTRAINT "nurse_growth_records_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_growth_records" ADD CONSTRAINT "nurse_growth_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_vaccination_records" ADD CONSTRAINT "nurse_vaccination_records_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "nurse_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nurse_vaccination_records" ADD CONSTRAINT "nurse_vaccination_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ══════════════════════════════════════════════════════════════
-- Seed: Create nurse profile for nurse.nusrat@hhdms.com
-- and assign all existing patients to this nurse
-- ══════════════════════════════════════════════════════════════

INSERT INTO "nurse_profiles" ("user_id", "nurse_type", "specialization", "license_number")
SELECT id, 'GENERAL', 'General Nursing', 'NUR-' || UPPER(SUBSTRING(id::text FROM 1 FOR 8))
FROM "users" WHERE email = 'nurse.nusrat@hhdms.com'
ON CONFLICT ("user_id") DO NOTHING;

INSERT INTO "nurse_patient_assignments" ("id", "nurse_id", "patient_id", "assigned_at", "status")
SELECT gen_random_uuid(), u.id, p.id, NOW(), 'ACTIVE'
FROM "users" u
CROSS JOIN "patients" p
WHERE u.email = 'nurse.nusrat@hhdms.com'
ON CONFLICT ("nurse_id", "patient_id") DO NOTHING;
