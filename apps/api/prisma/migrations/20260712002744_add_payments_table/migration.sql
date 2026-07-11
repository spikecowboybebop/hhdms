-- CreateTable "payments"
CREATE TABLE "payments" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "patient_id" uuid NOT NULL,
    "booking_session_id" uuid,
    "amount" numeric(10,2) NOT NULL,
    "currency" character varying(10) NOT NULL DEFAULT 'BDT',
    "service_type" character varying(30) NOT NULL,
    "stripe_payment_intent_id" character varying(255),
    "stripe_client_secret" character varying(500),
    "status" character varying(20) NOT NULL DEFAULT 'pending',
    "created_at" timestamp(6) with time zone DEFAULT now(),
    "completed_at" timestamp(6) with time zone,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_patient_id_idx" ON "payments"("patient_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
