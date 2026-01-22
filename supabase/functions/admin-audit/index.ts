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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorizzato" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(JSON.stringify({ error: "Token non valido" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email || "unknown";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Staff-only endpoint
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["owner", "admin", "moderator"])
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Accesso negato" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const body = await req.json();
    const action = String(body?.action ?? "").trim();
    const section = body?.section ? String(body.section) : null;
    const entity = body?.entity ? String(body.entity) : null;
    const entity_id = body?.entity_id ? String(body.entity_id) : null;
    const metadata = typeof body?.metadata === "object" && body?.metadata ? body.metadata : {};

    if (!action) {
      return new Response(JSON.stringify({ error: "Azione mancante" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { error: insertError } = await supabase.from("admin_audit_logs").insert({
      actor_user_id: userId,
      actor_role: roleData.role,
      actor_email: userEmail,
      action,
      section,
      entity,
      entity_id,
      metadata,
    });

    if (insertError) {
      console.error("Failed to write audit log:", insertError);
      return new Response(JSON.stringify({ error: "Errore audit" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error in admin-audit:", error);
    return new Response(JSON.stringify({ error: "Errore interno del server" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
