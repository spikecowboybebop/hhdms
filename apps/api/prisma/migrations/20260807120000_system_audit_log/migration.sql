-- System Audit Log (SRS 4.2 — Immutable Audit Logging) — additive only
-- Append-only table for admin module operations. No updates/deletes performed.
CREATE TABLE "system_audit_logs" (
    "id"           UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_role"    VARCHAR(50),
    "action"        VARCHAR(50) NOT NULL,
    "entity_type"   VARCHAR(50) NOT NULL,
    "entity_id"     UUID,
    "changes"       JSONB,
    "ip_address"    VARCHAR(64),
    "user_agent"    VARCHAR(512),
    "prev_hash"     VARCHAR(64) NOT NULL DEFAULT '',
    "content_hash"  VARCHAR(64) NOT NULL,
    "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Lookups: filter by actor, by entity, and by time window
CREATE INDEX "system_audit_logs_actor_user_id_idx"
    ON "system_audit_logs"("actor_user_id");
CREATE INDEX "system_audit_logs_entity_type_entity_id_idx"
    ON "system_audit_logs"("entity_type", "entity_id");
CREATE INDEX "system_audit_logs_created_at_idx"
    ON "system_audit_logs"("created_at");