import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type JsonRecord = Record<string, unknown>;

function json(status: number, body: JsonRecord) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asTrimmedString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asBoolean(v: unknown): boolean {
  return v === true || v === "true";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const body = (await req.json().catch(() => ({}))) as JsonRecord;
    const action = asTrimmedString(body.action);

    if (!action) return json(400, { error: "Azione mancante" });

    if (action === "restoreConversation") {
      const sessionId = asTrimmedString(body.session_id);
      const conversationId = asTrimmedString(body.conversation_id);

      if (!sessionId) return json(400, { error: "Sessione non valida" });

      if (conversationId) {
        const { data, error } = await supabase
          .from("assistant_conversations")
          .select("id, status")
          .eq("id", conversationId)
          .eq("session_id", sessionId)
          .maybeSingle();

        if (error) {
          console.error("[assistant-user-chat] restoreConversation error:", error);
          return json(500, { error: "Errore ripristino conversazione" });
        }

        if (!data || data.status === "archived") {
          return json(200, { conversation_id: null });
        }

        return json(200, { conversation_id: data.id });
      }

      // Fallback: latest active for this session
      const { data, error } = await supabase
        .from("assistant_conversations")
        .select("id, status")
        .eq("session_id", sessionId)
        .neq("status", "archived")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[assistant-user-chat] restoreConversation latest error:", error);
        return json(500, { error: "Errore ripristino conversazione" });
      }

      return json(200, { conversation_id: data?.id ?? null });
    }

    if (action === "fetchMessages") {
      const sessionId = asTrimmedString(body.session_id);
      const conversationId = asTrimmedString(body.conversation_id);
      const markRead = asBoolean(body.mark_read);

      if (!sessionId) return json(400, { error: "Sessione non valida" });
      if (!conversationId) return json(400, { error: "Conversazione non valida" });

      // Verify ownership by session
      const { data: conv, error: convError } = await supabase
        .from("assistant_conversations")
        .select("id, status")
        .eq("id", conversationId)
        .eq("session_id", sessionId)
        .maybeSingle();

      if (convError) {
        console.error("[assistant-user-chat] fetchMessages conv error:", convError);
        return json(500, { error: "Errore caricamento chat" });
      }

      if (!conv || conv.status === "archived") {
        return json(403, { error: "Accesso negato" });
      }

      // Mark admin messages as delivered when fetched (sent -> delivered)
      try {
        await supabase
          .from("assistant_messages")
          .update({ delivery_status: "delivered" })
          .eq("conversation_id", conversationId)
          .eq("sender_type", "admin")
          .or("delivery_status.is.null,delivery_status.eq.sent");
      } catch (e) {
        console.error("[assistant-user-chat] delivered update error:", e);
      }

      // Mark as read only when the chat panel is open
      if (markRead) {
        try {
          await supabase
            .from("assistant_messages")
            .update({
              is_read: true,
              read_at: new Date().toISOString(),
              delivery_status: "read",
            })
            .eq("conversation_id", conversationId)
            .eq("sender_type", "admin")
            .or("is_read.is.null,is_read.eq.false");
        } catch (e) {
          console.error("[assistant-user-chat] read update error:", e);
        }
      }

      const { data: messages, error: msgError } = await supabase
        .from("assistant_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.error("[assistant-user-chat] fetchMessages select error:", msgError);
        return json(500, { error: "Errore caricamento messaggi" });
      }

      return json(200, { messages: messages || [] });
    }

    return json(400, { error: "Azione non supportata" });
  } catch (err) {
    console.error("[assistant-user-chat] Unexpected error:", err);
    return json(500, { error: "Errore interno" });
  }
});
