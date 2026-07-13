-- AlterTable: make doctor_id nullable, add provider_type and specialist_id
ALTER TABLE "diagnostic_test_orders" ALTER COLUMN "doctor_id" DROP NOT NULL;

ALTER TABLE "diagnostic_test_orders" ADD COLUMN "provider_type" "provider_type_enum" NOT NULL DEFAULT 'MBBS';

ALTER TABLE "diagnostic_test_orders" ADD COLUMN "specialist_id" uuid;

-- CreateIndex
CREATE INDEX "diagnostic_test_orders_specialist_id_idx" ON "diagnostic_test_orders"("specialist_id");

-- AddForeignKey
ALTER TABLE "diagnostic_test_orders" ADD CONSTRAINT "diagnostic_test_orders_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialist_profiles"("user_id") ON UPDATE NO ACTION;
