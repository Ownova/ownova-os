import "server-only";
import { query, isAwsDbConfigured } from "@/lib/aws/db";
import type { ActivityItem } from "@/types";

/** Entity kinds the dashboard activity feed knows how to render. */
export type ActivityEntity = ActivityItem["type"];

interface LogActivityInput {
  /** Cognito sub of the acting user, or null for mock/demo sessions (whose sub isn't a real UUID). */
  actorId: string | null;
  entityType: ActivityEntity;
  /** Human-readable sentence shown directly in the feed, e.g. "New client added: Acme Ltd". */
  action: string;
  entityId?: string | null;
}

/**
 * Appends an entry to audit_log. Deliberately swallows its own errors: activity logging is a
 * nice-to-have side effect, and a failure here must never roll back or surface over the actual
 * business operation the user asked for (creating an invoice, a client, and so on).
 */
export async function logActivity({ actorId, entityType, action, entityId = null }: LogActivityInput): Promise<void> {
  if (!isAwsDbConfigured) return;
  try {
    await query(
      `insert into audit_log (actor_id, action, entity_type, entity_id)
       values (:actorId, :action, :entityType, :entityId)`,
      { actorId, action, entityType, entityId }
    );
  } catch {
    // Intentionally ignored -- see above.
  }
}

interface AuditRow {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
}

const KNOWN_ENTITIES: ActivityEntity[] = ["invoice", "client", "project", "task", "payment"];

function toActivityItem(row: AuditRow): ActivityItem {
  const entity = KNOWN_ENTITIES.includes(row.entity_type as ActivityEntity)
    ? (row.entity_type as ActivityEntity)
    : "task";
  return {
    id: row.id,
    type: entity,
    message: row.action,
    timestamp: row.created_at,
  };
}

/**
 * Most recent activity, newest first. Returns an empty array on a fresh install rather than
 * illustrative sample events -- the feed renders its own empty state.
 */
export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  if (!isAwsDbConfigured) return [];
  const rows = await query<AuditRow>(
    `select id, action, entity_type, created_at from audit_log order by created_at desc limit :limit`,
    { limit }
  );
  return rows.map(toActivityItem);
}
