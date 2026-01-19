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
    
    // Verify the user's JWT token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Token non valido" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify user is admin via user_metadata
    const isAdmin = user.user_metadata?.is_admin === true;
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Accesso negato - Solo admin" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, id, ids, status, filter, reservation } = await req.json();
    console.log(`Admin reservation action: ${action} by ${user.email}`);

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
        const { error } = await supabase
          .from("reservations")
          .delete()
          .neq("id", "");

        if (error) {
          console.error("Error resetting all reservations:", error);
          return new Response(
            JSON.stringify({ error: "Errore nel reset" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
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
