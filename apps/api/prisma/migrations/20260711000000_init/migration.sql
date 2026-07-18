-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "test_order_status_enum" AS ENUM ('ORDERED', 'COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "referral_status_enum" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "prescription_status_enum" AS ENUM ('ACTIVE', 'COMPLETED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "account_status_enum" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "provider_type_enum" AS ENUM ('MBBS', 'SPECIALIST');

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "first_name_en" VARCHAR(100) NOT NULL,
    "last_name_en" VARCHAR(100) NOT NULL,
    "first_name_bn" VARCHAR(100),
    "last_name_bn" VARCHAR(100),
    "role_id" INTEGER NOT NULL,
    "status" "account_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" VARCHAR(128),
    "last_login_at" TIMESTAMPTZ(6),
    "password_changed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "nutritionist_profilesId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mbbs_doctor_profiles" (
    "user_id" UUID NOT NULL,
    "license_number" VARCHAR(50) NOT NULL,
    "bmdc_registration" VARCHAR(50),
    "specialization" VARCHAR(100),
    "qualification" VARCHAR(255),
    "years_of_experience" INTEGER,
    "consultation_fee" DECIMAL(10,2),
    "signature_url" VARCHAR(512),
    "district" VARCHAR(100),
    "thana" VARCHAR(100),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mbbs_doctor_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "provider_schedules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fcm_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "device_type" VARCHAR(20) NOT NULL DEFAULT 'android',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "session_id" UUID,
    "type" VARCHAR(50),
    "patient_id" VARCHAR(50),
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutritionist_profiles" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutritionist_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutritionist_anthropometric_records" (
    "id" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "recorded_by" UUID NOT NULL,
    "height_cm" DOUBLE PRECISION,
    "weight_kg" DOUBLE PRECISION,
    "waist_cm" DOUBLE PRECISION,
    "hip_cm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "bmi_category" TEXT,
    "notes" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutritionist_anthropometric_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutritionist_diet_plans" (
    "id" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "nutritionist_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "condition_name" TEXT,
    "total_calories" INTEGER,
    "language" TEXT NOT NULL DEFAULT 'en',
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutritionist_diet_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutritionist_diet_plan_meals" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "meal_slot" TEXT NOT NULL,
    "calories" INTEGER,
    "preparation_guidance" TEXT,
    "foods_json" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nutritionist_diet_plan_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutritionist_follow_ups" (
    "id" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "nutritionist_id" UUID NOT NULL,
    "plan_id" TEXT,
    "interval" TEXT NOT NULL,
    "follow_up_at" TIMESTAMP(3),
    "reminder_channel" TEXT NOT NULL DEFAULT 'SMS',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutritionist_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutritionist_adherence_logs" (
    "id" TEXT NOT NULL,
    "patient_id" UUID NOT NULL,
    "nutritionist_id" UUID NOT NULL,
    "plan_id" TEXT,
    "follow_up_id" TEXT,
    "adherence_score" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION,
    "challenges" TEXT,
    "modifications" TEXT,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutritionist_adherence_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_bn" TEXT,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_templates" (
    "id" TEXT NOT NULL,
    "condition_name" TEXT NOT NULL,
    "description" TEXT,
    "total_calories" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diet_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diet_template_meals" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "meal_slot" TEXT NOT NULL,
    "calories" INTEGER,
    "preparation_guidance" TEXT,
    "foods_json" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "diet_template_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialist_profiles" (
    "user_id" UUID NOT NULL,
    "license_number" VARCHAR(50) NOT NULL,
    "bmdc_registration" VARCHAR(50),
    "specialty_code" VARCHAR(20) NOT NULL,
    "qualification" VARCHAR(255),
    "years_of_experience" INTEGER,
    "consultation_fee" DECIMAL(10,2),
    "signature_url" VARCHAR(512),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialist_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sonologist_profiles" (
    "user_id" UUID NOT NULL,
    "license_number" VARCHAR(50),
    "qualification" VARCHAR(255),
    "years_of_experience" INTEGER,
    "consultation_fee" DECIMAL(10,2),
    "equipment_ids" VARCHAR(500),
    "usg_specializations" VARCHAR(255),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sonologist_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "sonologist_studies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sonologist_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "modality" VARCHAR(20) NOT NULL DEFAULT 'USG',
    "body_part" VARCHAR(100),
    "study_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "dicom_series_uids" TEXT,
    "storage_url" VARCHAR(2000),
    "findings" TEXT,
    "impression" TEXT,
    "is_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sonologist_studies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sonologist_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "study_id" UUID NOT NULL,
    "sonologist_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "findings" TEXT NOT NULL,
    "impression" TEXT,
    "annotated_images" TEXT,
    "digital_signature_url" VARCHAR(512),
    "report_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sonologist_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_profiles" (
    "user_id" UUID NOT NULL,
    "gender" VARCHAR(10),
    "experience_years" INTEGER,
    "specializations" TEXT,
    "verification_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "training_certs" TEXT,
    "rating" DECIMAL(2,1),
    "phone_number" VARCHAR(20),
    "address" VARCHAR(255),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caregiver_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "caregiver_patient_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caregiver_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "service_type" VARCHAR(20),
    "patient_type" VARCHAR(20),
    "assigned_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "caregiver_patient_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_activity_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caregiver_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "shift_date" DATE DEFAULT CURRENT_TIMESTAMP,
    "activity_type" VARCHAR(30) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caregiver_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caregiver_condition_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "caregiver_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "report_type" VARCHAR(30) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL DEFAULT 'MODERATE',
    "alert_sent_to_nurse" BOOLEAN NOT NULL DEFAULT false,
    "alert_sent_to_doctor" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "caregiver_condition_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "booked_by" VARCHAR(255),
    "agent_id" UUID,
    "total_amount" DECIMAL(12,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "ticket_no" VARCHAR(50) NOT NULL,
    "service_type" VARCHAR(30) NOT NULL,
    "scheduled_date" DATE,
    "scheduled_time_slot" VARCHAR(20),
    "assigned_provider_id" UUID,
    "price" DECIMAL(10,2),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_specific_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "additional_meta" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_specific_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mrn" VARCHAR(50) NOT NULL,
    "first_name_en" VARCHAR(100) NOT NULL,
    "last_name_en" VARCHAR(100) NOT NULL,
    "first_name_bn" VARCHAR(100),
    "last_name_bn" VARCHAR(100),
    "date_of_birth" DATE,
    "sex" VARCHAR(1) NOT NULL,
    "blood_group" VARCHAR(5),
    "phone_number" VARCHAR(20),
    "alternative_phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "district" VARCHAR(100),
    "emergency_contact" VARCHAR(20),
    "emergency_contact_name" VARCHAR(100),
    "emergency_contact_relation" VARCHAR(100),
    "known_allergies" TEXT,
    "current_medications" TEXT,
    "past_medical_history" TEXT,
    "family_history" TEXT,
    "self_reported_symptoms" TEXT,
    "height_cm" DECIMAL(5,1),
    "weight_kg" DECIMAL(5,1),
    "booked_by" VARCHAR(255),
    "user_id" UUID,
    "has_emergency_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "file_name" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_url" VARCHAR(2000) NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_documents_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "doctor_patient_assignments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doctor_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "appointment_activity" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "patient_consent" VARCHAR(10),

    CONSTRAINT "doctor_patient_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_vital_signs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "pulse_bpm" INTEGER,
    "temperature_c" DECIMAL(4,1),
    "spo2_pct" INTEGER,
    "respiratory_rate" INTEGER,
    "weight_kg" DECIMAL(5,1),
    "height_cm" DECIMAL(5,1),
    "bmi" DECIMAL(4,1),
    "notes" TEXT,
    "is_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "recorded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icd10_codes" (
    "code" VARCHAR(10) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(100),
    "subcategory" VARCHAR(100),

    CONSTRAINT "icd10_codes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "patient_diagnoses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "icd10_code" VARCHAR(10) NOT NULL,
    "chief_complaint" TEXT,
    "history_of_present_illness" TEXT,
    "review_of_systems" TEXT,
    "examination_findings" TEXT,
    "preliminary_diagnosis" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "diagnosed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_test_catalog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "test_name" VARCHAR(200) NOT NULL,
    "test_code" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "normal_range" VARCHAR(200),
    "unit" VARCHAR(50),
    "turnaround_hours" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "diagnostic_test_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_test_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "test_id" UUID NOT NULL,
    "status" "test_order_status_enum" NOT NULL DEFAULT 'ORDERED',
    "clinical_notes" TEXT,
    "ordered_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "diagnostic_test_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_test_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "result_value" VARCHAR(100) NOT NULL,
    "result_numeric" DECIMAL(10,2),
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "is_abnormal" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "lab_technician" VARCHAR(100),
    "resulted_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_test_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialist_referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "referring_doctor_id" UUID NOT NULL,
    "specialty_code" VARCHAR(20) NOT NULL,
    "referral_reason" TEXT NOT NULL,
    "clinical_summary" TEXT,
    "is_emergency" BOOLEAN NOT NULL DEFAULT false,
    "status" "referral_status_enum" NOT NULL DEFAULT 'PENDING',
    "specialist_id" UUID,
    "response_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialist_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "diagnosis_id" UUID,
    "notes" TEXT,
    "digital_signature_url" VARCHAR(512),
    "status" "prescription_status_enum" NOT NULL DEFAULT 'ACTIVE',
    "issued_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_medications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prescription_id" UUID NOT NULL,
    "generic_name" VARCHAR(200) NOT NULL,
    "brand_name" VARCHAR(200),
    "dosage" VARCHAR(50) NOT NULL,
    "frequency" VARCHAR(100) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "route" VARCHAR(50) NOT NULL,
    "special_instructions" TEXT,

    CONSTRAINT "prescription_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "flagged_by" UUID NOT NULL,
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "resolved_by" UUID,

    CONSTRAINT "emergency_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_chain" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" UUID NOT NULL,
    "step_type" VARCHAR(50) NOT NULL,
    "step_id" VARCHAR(100) NOT NULL,
    "step_label" VARCHAR(255) NOT NULL,
    "actor_role" VARCHAR(50),
    "actor_name" VARCHAR(200),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_chain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "mbbs_doctor_profiles_license_number_key" ON "mbbs_doctor_profiles"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "mbbs_doctor_profiles_bmdc_registration_key" ON "mbbs_doctor_profiles"("bmdc_registration");

-- CreateIndex
CREATE UNIQUE INDEX "provider_schedules_provider_id_day_of_week_start_time_key" ON "provider_schedules"("provider_id", "day_of_week", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "fcm_tokens_user_id_token_key" ON "fcm_tokens"("user_id", "token");

-- CreateIndex
CREATE INDEX "server_notifications_user_id_delivered_idx" ON "server_notifications"("user_id", "delivered");

-- CreateIndex
CREATE UNIQUE INDEX "nutritionist_profiles_user_id_key" ON "nutritionist_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "diet_templates_condition_name_key" ON "diet_templates"("condition_name");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_profiles_license_number_key" ON "specialist_profiles"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_profiles_bmdc_registration_key" ON "specialist_profiles"("bmdc_registration");

-- CreateIndex
CREATE UNIQUE INDEX "sonologist_profiles_license_number_key" ON "sonologist_profiles"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "caregiver_patient_assignments_caregiver_id_patient_id_key" ON "caregiver_patient_assignments"("caregiver_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_tickets_ticket_no_key" ON "service_tickets"("ticket_no");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_specific_details_ticket_id_key" ON "ticket_specific_details"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "patients"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "patients_phone_number_key" ON "patients"("phone_number");

-- CreateIndex
CREATE INDEX "patient_diagnosis_reports_patient_id_idx" ON "patient_diagnosis_reports"("patient_id");

-- CreateIndex
CREATE INDEX "patient_diagnosis_reports_doctor_id_idx" ON "patient_diagnosis_reports"("doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_patient_assignments_doctor_id_patient_id_key" ON "doctor_patient_assignments"("doctor_id", "patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_test_catalog_test_code_key" ON "diagnostic_test_catalog"("test_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mbbs_doctor_profiles" ADD CONSTRAINT "mbbs_doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_schedules" ADD CONSTRAINT "provider_schedules_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "server_notifications" ADD CONSTRAINT "server_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_profiles" ADD CONSTRAINT "nutritionist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_anthropometric_records" ADD CONSTRAINT "nutritionist_anthropometric_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_anthropometric_records" ADD CONSTRAINT "nutritionist_anthropometric_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "nutritionist_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_diet_plans" ADD CONSTRAINT "nutritionist_diet_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_diet_plans" ADD CONSTRAINT "nutritionist_diet_plans_nutritionist_id_fkey" FOREIGN KEY ("nutritionist_id") REFERENCES "nutritionist_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_diet_plan_meals" ADD CONSTRAINT "nutritionist_diet_plan_meals_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "nutritionist_diet_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_follow_ups" ADD CONSTRAINT "nutritionist_follow_ups_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_follow_ups" ADD CONSTRAINT "nutritionist_follow_ups_nutritionist_id_fkey" FOREIGN KEY ("nutritionist_id") REFERENCES "nutritionist_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_follow_ups" ADD CONSTRAINT "nutritionist_follow_ups_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "nutritionist_diet_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_adherence_logs" ADD CONSTRAINT "nutritionist_adherence_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutritionist_adherence_logs" ADD CONSTRAINT "nutritionist_adherence_logs_nutritionist_id_fkey" FOREIGN KEY ("nutritionist_id") REFERENCES "nutritionist_profiles"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diet_template_meals" ADD CONSTRAINT "diet_template_meals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "diet_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specialist_profiles" ADD CONSTRAINT "specialist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sonologist_profiles" ADD CONSTRAINT "sonologist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sonologist_studies" ADD CONSTRAINT "sonologist_studies_sonologist_id_fkey" FOREIGN KEY ("sonologist_id") REFERENCES "sonologist_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sonologist_studies" ADD CONSTRAINT "sonologist_studies_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sonologist_reports" ADD CONSTRAINT "sonologist_reports_study_id_fkey" FOREIGN KEY ("study_id") REFERENCES "sonologist_studies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sonologist_reports" ADD CONSTRAINT "sonologist_reports_sonologist_id_fkey" FOREIGN KEY ("sonologist_id") REFERENCES "sonologist_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sonologist_reports" ADD CONSTRAINT "sonologist_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_profiles" ADD CONSTRAINT "caregiver_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_patient_assignments" ADD CONSTRAINT "caregiver_patient_assignments_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "caregiver_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_patient_assignments" ADD CONSTRAINT "caregiver_patient_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_activity_logs" ADD CONSTRAINT "caregiver_activity_logs_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "caregiver_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_activity_logs" ADD CONSTRAINT "caregiver_activity_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_condition_reports" ADD CONSTRAINT "caregiver_condition_reports_caregiver_id_fkey" FOREIGN KEY ("caregiver_id") REFERENCES "caregiver_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "caregiver_condition_reports" ADD CONSTRAINT "caregiver_condition_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "booking_sessions" ADD CONSTRAINT "booking_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "booking_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ticket_specific_details" ADD CONSTRAINT "ticket_specific_details_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_documents" ADD CONSTRAINT "patient_documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_diagnosis_reports" ADD CONSTRAINT "patient_diagnosis_reports_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_diagnosis_reports" ADD CONSTRAINT "patient_diagnosis_reports_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor_patient_assignments" ADD CONSTRAINT "doctor_patient_assignments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "doctor_patient_assignments" ADD CONSTRAINT "doctor_patient_assignments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_vital_signs" ADD CONSTRAINT "patient_vital_signs_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_vital_signs" ADD CONSTRAINT "patient_vital_signs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_icd10_code_fkey" FOREIGN KEY ("icd10_code") REFERENCES "icd10_codes"("code") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_test_orders" ADD CONSTRAINT "diagnostic_test_orders_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_test_orders" ADD CONSTRAINT "diagnostic_test_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_test_orders" ADD CONSTRAINT "diagnostic_test_orders_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "diagnostic_test_catalog"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_test_results" ADD CONSTRAINT "diagnostic_test_results_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "diagnostic_test_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "specialist_referrals" ADD CONSTRAINT "specialist_referrals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "specialist_referrals" ADD CONSTRAINT "specialist_referrals_referring_doctor_id_fkey" FOREIGN KEY ("referring_doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "specialist_referrals" ADD CONSTRAINT "specialist_referrals_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialist_profiles"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescription_medications" ADD CONSTRAINT "prescription_medications_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emergency_flags" ADD CONSTRAINT "emergency_flags_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emergency_flags" ADD CONSTRAINT "emergency_flags_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "referral_chain" ADD CONSTRAINT "referral_chain_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

