import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header to verify the user is logged in
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorizzato" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Use getClaims to verify JWT locally (more reliable than getUser which requires network call)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Token non valido' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email || 'unknown';

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify role via user_roles table (not user_metadata which is client-controllable)
    // Operators are allowed ONLY for non-destructive Open Mic management when explicitly permitted.
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['admin', 'owner', 'operator'])
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError, 'for user:', userId);
      return new Response(
        JSON.stringify({ error: "Accesso negato - Solo admin" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const userRole = roleData.role as string;
    console.log(`User ${userEmail} authenticated with role: ${userRole}`);

    const { action, id, ids, status, filter, reservation } = await req.json();
    console.log(`Admin reservation action: ${action} by ${userEmail}`);

    // Operators: allow ONLY safe actions, and only if they have the explicit permission.
    if (userRole === 'operator') {
      const operatorAllowedActions = new Set(['complete', 'reactivate']);
      if (!operatorAllowedActions.has(action)) {
        return new Response(
          JSON.stringify({ error: 'Accesso negato - Azione non consentita per Operatore' }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const { data: canManage, error: permErr } = await supabase.rpc('has_permission', {
        _user_id: userId,
        _permission_name: 'operator.openmic_manage',
      });

      if (permErr || !canManage) {
        return new Response(
          JSON.stringify({ error: 'Accesso negato - Permesso Open Mic non sufficiente' }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    switch (action) {
      case "complete": {
        if (!id) {
          return new Response(
            JSON.stringify({ error: "ID prenotazione mancante" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        const { error } = await supabase
          .from("reservations")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", id);

        if (error) {
          console.error("Error completing reservation:", error);
          return new Response(
            JSON.stringify({ error: "Errore nel completamento" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        break;
      }

      case "reactivate": {
        if (!id) {
          return new Response(
            JSON.stringify({ error: "ID prenotazione mancante" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        const { error } = await supabase
          .from("reservations")
          .update({
            status: "in_progress",
            completed_at: null,
          })
          .eq("id", id);

        if (error) {
          console.error("Error reactivating reservation:", error);
          return new Response(
            JSON.stringify({ error: "Errore nella riattivazione" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        break;
      }

      case "delete": {
        if (!id) {
          return new Response(
            JSON.stringify({ error: "ID prenotazione mancante" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        const { error } = await supabase
          .from("reservations")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("Error deleting reservation:", error);
          return new Response(
            JSON.stringify({ error: "Errore nella cancellazione" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        break;
      }

      case "deleteMultiple": {
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return new Response(
            JSON.stringify({ error: "IDs prenotazioni mancanti" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        const { error } = await supabase
          .from("reservations")
          .delete()
          .in("id", ids);

        if (error) {
          console.error("Error deleting multiple reservations:", error);
          return new Response(
            JSON.stringify({ error: "Errore nella cancellazione" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        break;
      }

      case "resetAll": {
        // Use gte with minimum UUID to delete all records (empty string is invalid for UUID)
        const { error } = await supabase
          .from("reservations")
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");

        if (error) {
          console.error("Error resetting all reservations:", error);
          return new Response(
            JSON.stringify({ error: "Errore nel reset" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        // Reset counters in both tables
        await resetEventCounters(supabase);
        break;
      }

      case "resetEverything": {
        // Reset Open Mic + Dediche ONLY (NOT community)
        // Includes: reservations, reservation_statuses, dediche conversations/messages, legacy messages
        console.log("Performing reset of Open Mic and Dediche data (excluding community)...");
        
        // 1. Delete all reservations (triggers sync_reservation_status to clean up reservation_statuses)
        const { error: reservationsError } = await supabase
          .from("reservations")
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");
        
        if (reservationsError) {
          console.error("Error resetting reservations:", reservationsError);
          return new Response(
            JSON.stringify({ error: "Errore nel reset prenotazioni" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // 2. Get dediche conversation IDs first
        const { data: dedicheConversations, error: fetchError } = await supabase
          .from("conversations")
          .select("id")
          .eq("section", "dediche");
        
        if (fetchError) {
          console.error("Error fetching dediche conversations:", fetchError);
        }
        
        const dedicheConvIds = dedicheConversations?.map(c => c.id) || [];
        
        if (dedicheConvIds.length > 0) {
          // 3. Delete chat messages from dediche conversations only
          const { error: chatMessagesError } = await supabase
            .from("chat_messages")
            .delete()
            .in("conversation_id", dedicheConvIds);
          
          if (chatMessagesError) {
            console.error("Error resetting dediche chat messages:", chatMessagesError);
          }

          // 4. Delete participants from dediche conversations only
          const { error: participantsError } = await supabase
            .from("conversation_participants")
            .delete()
            .in("conversation_id", dedicheConvIds);
          
          if (participantsError) {
            console.error("Error resetting dediche participants:", participantsError);
          }

          // 5. Delete dediche conversations only
          const { error: conversationsError } = await supabase
            .from("conversations")
            .delete()
            .eq("section", "dediche");
          
          if (conversationsError) {
            console.error("Error resetting dediche conversations:", conversationsError);
          }
        }

        // 6. Delete all legacy messages (these are dediche-related)
        const { error: messagesError } = await supabase
          .from("messages")
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");
        
        if (messagesError) {
          console.error("Error resetting messages:", messagesError);
        }

        console.log("Open Mic + Dediche reset completed (community preserved)");
        break;
      }

      case "resetOpenMic": {
        // Reset only Open Mic: reservations (and reservation_statuses via trigger)
        console.log("Resetting Open Mic reservations only...");
        
        const { error } = await supabase
          .from("reservations")
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");
        
        if (error) {
          console.error("Error resetting reservations:", error);
          return new Response(
            JSON.stringify({ error: "Errore nel reset prenotazioni" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        console.log("Open Mic reset completed");
        break;
      }

      case "resetMessages": {
        // Reset only Messages: conversations, chat_messages, conversation_participants, messages
        console.log("Resetting all messages and conversations...");
        
        // Delete all chat messages
        const { error: chatMessagesError } = await supabase
          .from("chat_messages")
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");
        
        if (chatMessagesError) {
          console.error("Error resetting chat messages:", chatMessagesError);
          return new Response(
            JSON.stringify({ error: "Errore nel reset messaggi chat" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Delete all conversation participants
        const { error: participantsError } = await supabase
          .from("conversation_participants")
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");
        
        if (participantsError) {
          console.error("Error resetting conversation participants:", participantsError);
        }

        // Delete all conversations
        const { error: conversationsError } = await supabase
          .from("conversations")
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");
        
        if (conversationsError) {
          console.error("Error resetting conversations:", conversationsError);
        }

        // Delete all legacy messages
        const { error: messagesError } = await supabase
          .from("messages")
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");
        
        if (messagesError) {
          console.error("Error resetting messages:", messagesError);
        }

        console.log("Messages reset completed");
        break;
      }

      case "resetSongStatuses": {
        // Reset only song statuses (make all songs bookable again)
        console.log("Resetting song statuses only...");
        
        const { error } = await supabase
          .from("reservation_statuses")
          .delete()
          .gte("id", "00000000-0000-0000-0000-000000000000");
        
        if (error) {
          console.error("Error resetting song statuses:", error);
          return new Response(
            JSON.stringify({ error: "Errore nel reset stati canzoni" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        console.log("Song statuses reset completed");
        break;
      }

      case "resetActive": {
        const { error } = await supabase
          .from("reservations")
          .delete()
          .eq("status", "in_progress");

        if (error) {
          console.error("Error resetting active reservations:", error);
          return new Response(
            JSON.stringify({ error: "Errore nel reset" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        break;
      }

      case "resetCompleted": {
        const { error } = await supabase
          .from("reservations")
          .delete()
          .eq("status", "completed");

        if (error) {
          console.error("Error resetting completed reservations:", error);
          return new Response(
            JSON.stringify({ error: "Errore nel reset" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        break;
      }

      case "restore": {
        if (!reservation) {
          return new Response(
            JSON.stringify({ error: "Dati prenotazione mancanti" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        
        const { error } = await supabase
          .from("reservations")
          .insert({
            id: reservation.id,
            customer_name: reservation.customer_name,
            song_title: reservation.song_title,
            song_artist: reservation.song_artist,
            status: reservation.status,
            completed_at: reservation.completed_at,
            created_at: reservation.created_at,
          });

        if (error) {
          console.error("Error restoring reservation:", error);
          return new Response(
            JSON.stringify({ error: "Errore nel ripristino" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        break;
      }

      case "resetUserCounts": {
        // Reset all user booking counts for the active event
        // First, get the active event/free mode ID
        const { data: liveEvent } = await supabase
          .from('event_booking_rules')
          .select('id')
          .eq('event_status', 'live')
          .maybeSingle();
        
        const { data: freeMode } = await supabase
          .from('free_mode_settings')
          .select('id')
          .eq('is_active', true)
          .maybeSingle();
        
        const eventId = liveEvent?.id || freeMode?.id;
        
        if (eventId) {
          const { error } = await supabase
            .from("user_booking_counts")
            .delete()
            .eq("event_id", eventId);

          if (error) {
            console.error("Error resetting user counts:", error);
            return new Response(
              JSON.stringify({ error: "Errore nel reset conteggi utente" }),
              { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
          console.log(`Reset user booking counts for event: ${eventId}`);
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Azione non valida" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in admin-reservations:", error);
    return new Response(
      JSON.stringify({ error: "Errore interno del server" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
