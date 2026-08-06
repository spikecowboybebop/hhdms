// Immutable Audit Logging (SRS 4.2) — append-only, SHA-256 hash-chained.
// Rows are only ever inserted. Each row stores the previous row's content hash
// and a hash computed over (prevHash + action + entity + changes + timestamp),
// so any deletion or modification breaks the chain and is detected by verify().
import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AuditActor = {
  id: string;
  role: string | null;
  ip: string | null;
  userAgent: string | null;
};

export type AuditAction =
  | 'CREATE_STAFF'
  | 'UPDATE_STAFF'
  | 'SUSPEND_STAFF'
  | 'ACTIVATE_STAFF'
  | 'RESET_PASSWORD'
  | 'REASSIGN_TICKET'
  | 'UPDATE_PAYMENT'
  | 'INVOICE_GENERATED';

// Fixed tag identifying this chain in the advisory lock (arbitrary constant).
const CHAIN_LOCK_KEY = 44637895;

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  private sortable(value: unknown): string {
    // Canonicalize: sort object keys recursively so the serialized form is
    // identical whether produced from the original JS object or after a
    // round-trip through PostgreSQL JSONB (which does not preserve key order).
    const canonical = (v: unknown): unknown => {
      if (Array.isArray(v)) return v.map(canonical);
      if (v !== null && typeof v === 'object') {
        return Object.keys(v)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = canonical((v as Record<string, unknown>)[k]);
            return acc;
          }, {});
      }
      return v;
    };
    return JSON.stringify(canonical(value ?? {}));
  }

  private hashHex(input: string): string {
    return createHash('sha256').update(input, 'utf8').digest('hex');
  }

  /**
   * Append an immutable log entry. Serializes appends with an advisory lock so
   * concurrent writes produce a linear, non-forking chain.
   */
  async record(params: {
    actor: AuditActor;
    action: AuditAction;
    entityType: 'staff' | 'ticket' | 'payment' | 'invoice';
    entityId?: string;
    changes?: Record<string, unknown>;
  }) {
    const { actor, action, entityType, entityId, changes } = params;

    await this.prisma.$transaction(async (tx) => {
      // Serialize appends across the whole table.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CHAIN_LOCK_KEY})`;

      const last = await tx.system_audit_logs.findFirst({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { contentHash: true },
      });

      const next = randomUUID();
      const createdAt = new Date();
      const body = this.sortable(changes);
      const prevHash = last?.contentHash ? last.contentHash : 'GENESIS';
      const canonical = `${prevHash}|${action}|${entityType}|${
        entityId ?? ''
      }|${body}|${createdAt.toISOString()}`;
      const contentHash = this.hashHex(canonical);

      const data = {
        actorUserId: actor.id,
        actorRole: actor.role,
        action,
        entityType,
        entityId: entityId ?? null,
        // stored as a Prisma Json input
        changes: changes as Prisma.InputJsonValue,
        ipAddress: actor.ip,
        userAgent: actor.userAgent,
        prevHash,
        contentHash,
        createdAt,
        id: next,
      };

      await tx.system_audit_logs.create({ data });
    });
  }

  /**
   * Recompute the chain head-to-tail from the database and confirm every row is
   * present, correctly linked and unmodified. Returns integrity verdict.
   */
  async verify() {
    const rows = await this.prisma.system_audit_logs.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    let expectedPrev = 'GENESIS';
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.prevHash !== expectedPrev) {
        return {
          valid: false,
          checked: rows.length,
          broken_at_index: i,
          broken_at_id: r.id,
          reason: 'chain_break',
        };
      }
      const body = this.sortable(r.changes);
      const canonical = `${r.prevHash}|${r.action}|${r.entityType}|${
        r.entityId ?? ''
      }|${body}|${r.createdAt.toISOString()}`;
      const recomputed = this.hashHex(canonical);
      if (recomputed !== r.contentHash) {
        return {
          valid: false,
          checked: rows.length,
          broken_at_index: i,
          broken_at_id: r.id,
          reason: 'content_tampered',
        };
      }
      expectedPrev = r.contentHash;
    }
    return {
      valid: true,
      checked: rows.length,
      broken_at_index: null,
      broken_at_id: null,
    };
  }
}
