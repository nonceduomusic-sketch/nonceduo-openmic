import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PBKDF2 password hashing
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, username, password } = await req.json();

    // Input validation
    if (!token || typeof token !== "string") {
      return new Response(
        JSON.stringify({ error: "Token mancante" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "Username deve essere almeno 3 caratteri" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password deve essere almeno 8 caratteri" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token is valid and not expired
    const { data: tokenData, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("*, admin_users!inner(id, username)")
      .eq("token", token)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.error("Invalid or expired token:", tokenError);
      return new Response(
        JSON.stringify({ error: "Token non valido o scaduto" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Hash the new password
    const passwordHash = await hashPassword(password);

    // Update admin credentials
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({
        username: username.trim(),
        password_hash: passwordHash
      })
      .eq("id", tokenData.admin_user_id);

    if (updateError) {
      console.error("Error updating credentials:", updateError);
      return new Response(
        JSON.stringify({ error: "Errore nell'aggiornamento delle credenziali" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenData.id);

    console.log("Admin credentials reset successfully for:", username.trim());
    return new Response(
      JSON.stringify({ success: true, message: "Credenziali aggiornate con successo" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in reset-admin-credentials:", error);
    return new Response(
      JSON.stringify({ error: "Errore interno del server" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
