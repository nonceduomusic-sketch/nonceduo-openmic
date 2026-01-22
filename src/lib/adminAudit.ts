import { supabase } from "@/integrations/supabase/client";

type AuditPayload = {
  action: string;
  section?: string | null;
  entity?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Best-effort audit logging.
 * Never blocks UX: failures are logged to console only.
 */
export async function adminAuditLog(payload: AuditPayload) {
  try {
    const res = await supabase.functions.invoke("admin-audit", {
      body: {
        action: payload.action,
        section: payload.section ?? null,
        entity: payload.entity ?? null,
        entity_id: payload.entity_id ?? null,
        metadata: payload.metadata ?? {},
      },
    });

    if (res.error) {
      // eslint-disable-next-line no-console
      console.warn("Audit failed:", res.error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("Audit error:", e);
  }
}
