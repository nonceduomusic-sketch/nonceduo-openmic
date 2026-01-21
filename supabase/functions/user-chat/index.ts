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

async function isSessionBlocked(supabase: any, sessionId: string): Promise<boolean> {
  if (!sessionId) return false;

  const { data, error } = await supabase
    .from("blocked_users")
    .select("id, expires_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("blocked_users check error:", error);
    // Fail-open to avoid breaking chat if the check errors out
    return false;
  }

  if (!data) return false;
  if (!data.expires_at) return true;

  return new Date(data.expires_at) > new Date();
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

    if (action === "startConversation") {
      const senderName = asTrimmedString(body.sender_name);
      const messageText = asTrimmedString(body.message_text);
      const sessionId = asTrimmedString(body.session_id);

      if (!senderName) return json(400, { error: "Inserisci il tuo nome" });
      if (!messageText) return json(400, { error: "Inserisci un messaggio" });
      if (!sessionId) return json(400, { error: "Sessione non valida" });

      if (await isSessionBlocked(supabase, sessionId)) {
        return json(403, { error: "Il tuo account è sospeso" });
      }

      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .insert([{ is_group: false, is_public: false, is_read: false }])
        .select("*")
        .single();

      if (convError) {
        console.error("startConversation conv insert error:", convError);
        return json(500, { error: "Errore creazione conversazione" });
      }

      const { data: partData, error: partError } = await supabase
        .from("conversation_participants")
        .insert([
          {
            conversation_id: convData.id,
            participant_name: senderName,
            session_id: sessionId,
          },
        ])
        .select("*")
        .single();

      if (partError) {
        console.error("startConversation participant insert error:", partError);
        return json(500, { error: "Errore aggiunta partecipante" });
      }

      const { data: msgData, error: msgError } = await supabase
        .from("chat_messages")
        .insert([
          {
            conversation_id: convData.id,
            sender_type: "user",
            sender_name: senderName,
            sender_session_id: sessionId,
            message_text: messageText,
            status: "delivered", // New messages are instantly delivered
          },
        ])
        .select("*")
        .single();

      if (msgError) {
        console.error("startConversation message insert error:", msgError);
        return json(500, { error: "Errore invio messaggio" });
      }

      return json(200, { conversation: convData, participant: partData, message: msgData });
    }

    if (action === "sendMessage") {
      const conversationId = asTrimmedString(body.conversation_id);
      const senderName = asTrimmedString(body.sender_name);
      const messageText = asTrimmedString(body.message_text);
      const sessionId = asTrimmedString(body.session_id);

      if (!conversationId) return json(400, { error: "Conversazione non valida" });
      if (!senderName) return json(400, { error: "Inserisci il tuo nome" });
      if (!messageText) return json(400, { error: "Inserisci un messaggio" });
      if (!sessionId) return json(400, { error: "Sessione non valida" });

      if (await isSessionBlocked(supabase, sessionId)) {
        return json(403, { error: "Il tuo account è sospeso" });
      }

      const { data: membership, error: membershipError } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("session_id", sessionId)
        .maybeSingle();

      if (membershipError) {
        console.error("sendMessage membership check error:", membershipError);
        return json(500, { error: "Errore verifica partecipazione" });
      }

      if (!membership) {
        return json(403, { error: "Non sei un partecipante di questa conversazione" });
      }

      const { data: msgData, error: msgError } = await supabase
        .from("chat_messages")
        .insert([
          {
            conversation_id: conversationId,
            sender_type: "user",
            sender_name: senderName,
            sender_session_id: sessionId,
            message_text: messageText,
            status: "delivered", // User messages are instantly delivered
          },
        ])
        .select("*")
        .single();

      if (msgError) {
        console.error("sendMessage insert error:", msgError);
        return json(500, { error: "Errore invio messaggio" });
      }

      // Mark conversation as unread for admin (new user message)
      await supabase
        .from("conversations")
        .update({ is_read: false })
        .eq("id", conversationId);

      // Mark admin messages in this conversation as read
      await supabase
        .from("chat_messages")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("sender_type", "admin")
        .neq("status", "read");

      return json(200, { message: msgData });
    }

    if (action === "markMessagesAsRead") {
      const conversationId = asTrimmedString(body.conversation_id);
      const sessionId = asTrimmedString(body.session_id);

      if (!conversationId || !sessionId) {
        return json(400, { error: "Parametri mancanti" });
      }

      // Mark admin messages as read when user views them
      const { error } = await supabase
        .from("chat_messages")
        .update({ status: "read", read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("sender_type", "admin")
        .neq("status", "read");

      if (error) {
        console.error("markMessagesAsRead error:", error);
        return json(500, { error: "Errore aggiornamento stato" });
      }

      return json(200, { success: true });
    }

    return json(400, { error: "Azione non supportata" });
  } catch (error) {
    console.error("user-chat error:", error);
    return json(500, { error: "Errore inatteso" });
  }
});
