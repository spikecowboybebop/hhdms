-- CreateEnum
CREATE TYPE "teleconsult_status_enum" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "teleconsult_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referral_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "specialist_id" UUID NOT NULL,
    "status" "teleconsult_status_enum" NOT NULL DEFAULT 'PENDING',
    "room_name" VARCHAR(100) NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teleconsult_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teleconsult_sessions_room_name_key" ON "teleconsult_sessions"("room_name");

-- CreateIndex
CREATE INDEX "teleconsult_sessions_referral_id_idx" ON "teleconsult_sessions"("referral_id");
