-- Staff Profile Provisioning (SRS §5.1) — additive only
-- Adds profile fields used by the admin "add new staff profile" flow.

-- AlterTable: global identity fields shared by all providers
ALTER TABLE "users"
    ADD COLUMN "nid"       VARCHAR(50),
    ADD COLUMN "photo_url" VARCHAR(512);

-- AlterTable: MBBS Doctor profile
ALTER TABLE "mbbs_doctor_profiles"
    ADD COLUMN "service_area" VARCHAR(255);

-- AlterTable: Specialist profile
ALTER TABLE "specialist_profiles"
    ADD COLUMN "sub_specialties" VARCHAR(255),
    ADD COLUMN "service_area"    VARCHAR(255);

-- AlterTable: Nurse profile (SRS: BNMC Reg No, Qualifications, Skills, Shift Preference, GPS Device ID)
ALTER TABLE "nurse_profiles"
    ADD COLUMN "bnmc_registration" VARCHAR(50),
    ADD COLUMN "qualifications"    VARCHAR(255),
    ADD COLUMN "skills"            VARCHAR(255),
    ADD COLUMN "shift_preference"  VARCHAR(50),
    ADD COLUMN "gps_device_id"     VARCHAR(100);

-- AlterTable: Nutritionist profile
ALTER TABLE "nutritionist_profiles"
    ADD COLUMN "consultation_fee" DECIMAL(10,2),
    ADD COLUMN "is_available"     BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN "qualifications"   VARCHAR(255),
    ADD COLUMN "service_area"     VARCHAR(255),
    ADD COLUMN "specializations"  VARCHAR(255);

-- CreateIndex: enrollments must reference a distinct BMWC registration number
CREATE UNIQUE INDEX "nurse_profiles_bnmc_registration_key"
    ON "nurse_profiles"("bnmc_registration");