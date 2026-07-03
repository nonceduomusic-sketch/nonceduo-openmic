import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Tables considered "history/logs" — subset used for lighter backup
const HISTORY_TABLES = [
  "chat_messages", "messages", "private_messages", "message_requests",
  "typing_indicators", "live_reactions", "notifications", "notification_logs",
  "security_rate_limits", "admin_audit_logs", "pin_sessions",
  "broadcast_remote_sessions", "post_likes", "post_comments", "posts",
  "performance_votes", "performance_vote_counts", "reservations",
  "reservations_archive", "user_participations",
];

// Tables to always skip in "full" mode (managed by supabase or too large/binary)
const SKIP_TABLES = new Set<string>([]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.get?.("authorization") ?? req.headers.get("authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user + owner role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isOwner } = await admin.rpc("is_owner", { _user_id: userData.user.id });
    if (!isOwner) return json({ error: "Only owners can export backups" }, 403);

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") ?? "history"; // "history" | "full"

    // Discover public tables
    let tables: string[];
    if (mode === "history") {
      tables = HISTORY_TABLES;
    } else {
      const { data: allTables } = await admin.rpc("admin_db_stats");
      tables = (allTables ?? []).map((r: any) => r.table_name).filter((t: string) => !SKIP_TABLES.has(t));
    }

    const backup: Record<string, any> = {
      generated_at: new Date().toISOString(),
      mode,
      tables: {},
    };

    for (const table of tables) {
      const rows: any[] = [];
      let from = 0;
      const step = 1000;
      // Cap at 100k rows/table
      while (from < 100000) {
        const { data, error } = await admin.from(table).select("*").range(from, from + step - 1);
        if (error) {
          backup.tables[table] = { error: error.message };
          break;
        }
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < step) break;
        from += step;
      }
      if (!backup.tables[table]?.error) {
        backup.tables[table] = { count: rows.length, rows };
      }
    }

    const filename = `nonceduo-backup-${mode}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
