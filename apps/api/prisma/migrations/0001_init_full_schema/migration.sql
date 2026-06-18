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
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mbbs_doctor_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "nutritionist_profiles" (
    "user_id" UUID NOT NULL,
    "license_number" VARCHAR(50),
    "specialization" VARCHAR(100),
    "qualification" VARCHAR(255),
    "years_of_experience" INTEGER,
    "consultation_fee" DECIMAL(10,2),
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nutritionist_profiles_pkey" PRIMARY KEY ("user_id")
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
    "email" VARCHAR(255),
    "address_line1" VARCHAR(255),
    "address_line2" VARCHAR(255),
    "district" VARCHAR(100),
    "emergency_contact" VARCHAR(20),
    "known_allergies" TEXT,
    "current_medications" TEXT,
    "past_medical_history" TEXT,
    "family_history" TEXT,
    "height_cm" DECIMAL(5,1),
    "weight_kg" DECIMAL(5,1),
    "has_emergency_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "nutritionist_profiles_license_number_key" ON "nutritionist_profiles"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_profiles_license_number_key" ON "specialist_profiles"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "specialist_profiles_bmdc_registration_key" ON "specialist_profiles"("bmdc_registration");

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "patients"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_test_catalog_test_code_key" ON "diagnostic_test_catalog"("test_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "mbbs_doctor_profiles" ADD CONSTRAINT "mbbs_doctor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nutritionist_profiles" ADD CONSTRAINT "nutritionist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "specialist_profiles" ADD CONSTRAINT "specialist_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_vital_signs" ADD CONSTRAINT "patient_vital_signs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_vital_signs" ADD CONSTRAINT "patient_vital_signs_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "patient_diagnoses" ADD CONSTRAINT "patient_diagnoses_icd10_code_fkey" FOREIGN KEY ("icd10_code") REFERENCES "icd10_codes"("code") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_test_orders" ADD CONSTRAINT "diagnostic_test_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_test_orders" ADD CONSTRAINT "diagnostic_test_orders_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_test_orders" ADD CONSTRAINT "diagnostic_test_orders_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "diagnostic_test_catalog"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "diagnostic_test_results" ADD CONSTRAINT "diagnostic_test_results_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "diagnostic_test_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "specialist_referrals" ADD CONSTRAINT "specialist_referrals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "specialist_referrals" ADD CONSTRAINT "specialist_referrals_referring_doctor_id_fkey" FOREIGN KEY ("referring_doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "prescription_medications" ADD CONSTRAINT "prescription_medications_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emergency_flags" ADD CONSTRAINT "emergency_flags_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "emergency_flags" ADD CONSTRAINT "emergency_flags_flagged_by_fkey" FOREIGN KEY ("flagged_by") REFERENCES "mbbs_doctor_profiles"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "referral_chain" ADD CONSTRAINT "referral_chain_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
