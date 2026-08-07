-- Discard SMS feature: drop the sms_logs table (previously added by 20260810120000_add_sms_logs)

-- DropForeignKey
ALTER TABLE "sms_logs" DROP CONSTRAINT "sms_logs_patient_id_fkey";

-- DropTable
DROP TABLE "sms_logs";