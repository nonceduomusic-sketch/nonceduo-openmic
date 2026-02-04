import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

function asJsonObject(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function assertNonEmpty(name: string, v: string) {
  if (!v) throw new Error(`${name} mancante`);
}

function normalizeSection(v: string): string {
  const s = v.trim().toLowerCase();
  if (s === "site" || s === "openmic" || s === "dediche" || s === "community") return s;
  return "site";
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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

    if (action === "createConversation") {
      try {
        const sessionId = asTrimmedString(body.session_id);
        assertNonEmpty("session_id", sessionId);

        const sourceSection = normalizeSection(asTrimmedString(body.source_section || "site"));
        const sourceUrl = asTrimmedString(body.source_url);
        const userName = asTrimmedString(body.user_name);
        const userEmail = asTrimmedString(body.user_email);
        const leadType = asTrimmedString(body.lead_type);

        const { data, error } = await supabase
          .from("assistant_conversations")
          .insert({
            session_id: sessionId,
            source_section: sourceSection,
            source_url: sourceUrl || null,
            user_name: userName || null,
            user_email: userEmail || null,
            lead_type: leadType || null,
            status: "active",
          })
          .select("id")
          .single();

        if (error) {
          console.error("[assistant-user-chat] createConversation error:", error);
          return json(500, { error: "Errore creazione conversazione" });
        }

        return json(200, { conversation_id: data?.id ?? null });
      } catch (e) {
        console.error("[assistant-user-chat] createConversation unexpected:", e);
        return json(400, { error: (e as Error)?.message || "Richiesta non valida" });
      }
    }

    if (action === "updateConversation") {
      try {
        const sessionId = asTrimmedString(body.session_id);
        const conversationId = asTrimmedString(body.conversation_id);
        assertNonEmpty("session_id", sessionId);
        assertNonEmpty("conversation_id", conversationId);

        // verify ownership by session
        const { data: conv, error: convError } = await supabase
          .from("assistant_conversations")
          .select("id")
          .eq("id", conversationId)
          .eq("session_id", sessionId)
          .maybeSingle();

        if (convError) {
          console.error("[assistant-user-chat] updateConversation verify error:", convError);
          return json(500, { error: "Errore aggiornamento conversazione" });
        }

        if (!conv) {
          return json(403, { error: "Accesso negato" });
        }

        const updates = asJsonObject(body.updates);
        // allowlist fields
        const allowed: Record<string, unknown> = {};
        if (typeof updates.user_name === "string") allowed.user_name = updates.user_name.trim() || null;
        if (typeof updates.user_email === "string") allowed.user_email = updates.user_email.trim() || null;
        if (typeof updates.lead_type === "string") allowed.lead_type = updates.lead_type.trim() || null;
        if (typeof updates.lead_score === "number") allowed.lead_score = updates.lead_score;
        if (Array.isArray(updates.flow_path)) allowed.flow_path = updates.flow_path;

        allowed.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from("assistant_conversations")
          .update(allowed)
          .eq("id", conversationId)
          .eq("session_id", sessionId);

        if (error) {
          console.error("[assistant-user-chat] updateConversation update error:", error);
          return json(500, { error: "Errore aggiornamento conversazione" });
        }

        return json(200, { ok: true });
      } catch (e) {
        console.error("[assistant-user-chat] updateConversation unexpected:", e);
        return json(400, { error: (e as Error)?.message || "Richiesta non valida" });
      }
    }

    if (action === "sendMessage") {
      try {
        const sessionId = asTrimmedString(body.session_id);
        const conversationId = asTrimmedString(body.conversation_id);
        const senderType = asTrimmedString(body.sender_type);
        const senderName = asTrimmedString(body.sender_name);
        const messageText = asTrimmedString(body.message_text);
        const metadata = asJsonObject(body.metadata);

        assertNonEmpty("session_id", sessionId);
        assertNonEmpty("conversation_id", conversationId);
        assertNonEmpty("message_text", messageText);

        if (messageText.length > 4000) {
          return json(400, { error: "Messaggio troppo lungo" });
        }

        if (senderType !== "user" && senderType !== "bot" && senderType !== "admin") {
          return json(400, { error: "sender_type non valido" });
        }

        // Users/bots must own conversation via session
        if (senderType === "user" || senderType === "bot") {
          const { data: conv, error: convError } = await supabase
            .from("assistant_conversations")
            .select("id, status")
            .eq("id", conversationId)
            .eq("session_id", sessionId)
            .maybeSingle();

          if (convError) {
            console.error("[assistant-user-chat] sendMessage verify error:", convError);
            return json(500, { error: "Errore invio messaggio" });
          }

          if (!conv || conv.status === "archived") {
            return json(403, { error: "Accesso negato" });
          }
        }

        const { data: msg, error: msgError } = await supabase
          .from("assistant_messages")
          .insert({
            conversation_id: conversationId,
            sender_type: senderType,
            sender_name: senderName || null,
            message_text: messageText,
            message_type: "text",
            metadata: metadata,
            is_read: senderType === "user" ? false : null,
            delivery_status: "sent",
          })
          .select("*")
          .single();

        if (msgError) {
          console.error("[assistant-user-chat] sendMessage insert error:", msgError);
          return json(500, { error: "Errore invio messaggio" });
        }

        // Touch conversation timestamp for ordering/notifications
        try {
          await supabase
            .from("assistant_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", conversationId);
        } catch (e) {
          console.error("[assistant-user-chat] sendMessage touch error:", e);
        }

        return json(200, { message: msg });
      } catch (e) {
        console.error("[assistant-user-chat] sendMessage unexpected:", e);
        return json(400, { error: (e as Error)?.message || "Richiesta non valida" });
      }
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
