import { getSupabaseAdmin, hasServiceRoleKey } from '../supabase/admin.ts';

export interface AuditLogPayload {
  actorUserId?: string | null;
  actorNameSnapshot?: string | null;
  actorRoleSnapshot?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabelSnapshot?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  reason?: string | null;
  details?: string | null;
  metadata?: Record<string, any>;
  canUndo?: boolean;
  requestId?: string | null;
}

const REDACTED_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'api_key',
  'authorization',
  'credentials',
  'cookie',
  'session',
];

/**
 * Strips sensitive keys (passwords, tokens, secrets) before writing to audit logs.
 */
export function sanitizeAuditData<T = any>(data: T): T {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item)) as unknown as T;
  }

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data as Record<string, any>)) {
    const lower = k.toLowerCase();
    const isSensitive = REDACTED_KEYS.some((sensitive) => lower.includes(sensitive));
    if (isSensitive) {
      clean[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      clean[k] = sanitizeAuditData(v);
    } else {
      clean[k] = v;
    }
  }
  return clean as T;
}

/**
 * Creates an append-only audit log entry in Supabase.
 * Server-side identity and timestamp are strictly enforced.
 */
export async function logAuditEvent(
  payload: AuditLogPayload,
  clientOverride?: any
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    let db = clientOverride;
    if (!db && hasServiceRoleKey()) {
      db = getSupabaseAdmin();
    }
    if (!db) {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        db = await createClient();
      } catch (err: any) {
        console.warn('Could not initialize session Supabase client for audit log:', err?.message);
      }
    }
    if (!db) {
      db = getSupabaseAdmin();
    }

    if (!db) {
      return { success: false, error: 'Database client unavailable' };
    }

    const cleanOld = sanitizeAuditData(payload.oldValues);
    const cleanNew = sanitizeAuditData(payload.newValues);
    const cleanMeta = sanitizeAuditData(payload.metadata || {});

    const record = {
      actor_id: payload.actorUserId || null,
      actor_name_snapshot: payload.actorNameSnapshot || null,
      actor_role_snapshot: payload.actorRoleSnapshot || null,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId ? String(payload.entityId) : null,
      entity_label_snapshot: payload.entityLabelSnapshot || null,
      previous_state: cleanOld || null,
      old_values: cleanOld || null,
      new_state: cleanNew || null,
      new_values: cleanNew || null,
      reason: payload.reason || null,
      details: payload.details || payload.reason || null,
      metadata: cleanMeta,
      can_undo: payload.canUndo !== false,
      request_id: payload.requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null),
      is_undone: false,
    };

    const { data, error } = await db
      .from('audit_logs')
      .insert(record)
      .select('id')
      .single();

    if (error) {
      console.warn('Failed to insert audit log record:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, logId: data?.id };
  } catch (err: any) {
    console.warn('Audit logger exception:', err?.message || err);
    return { success: false, error: err?.message || 'Unknown logging error' };
  }
}

