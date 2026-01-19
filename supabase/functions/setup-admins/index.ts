import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert Uint8Array to hex string
function toHex(buffer: Uint8Array): string {
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash password using PBKDF2 (Web Crypto API compatible with Supabase Edge)
async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const encoder = new TextEncoder();
  const actualSalt = salt || crypto.randomUUID();
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
      salt: encoder.encode(actualSalt),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const hashHex = toHex(hashArray);
  
  return { hash: `${actualSalt}:${hashHex}`, salt: actualSalt };
}

// This function sets up admin users with hashed passwords
// Call it once to initialize the admin users
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { setupKey } = await req.json();
    
    // Simple protection - require a setup key
    if (setupKey !== "SETUP_KARAOKE_ADMINS_2026") {
      return new Response(
        JSON.stringify({ error: "Invalid setup key" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Hash the password using PBKDF2
    const password = "nonceduo2026!";
    const { hash: hashedPassword } = await hashPassword(password);
    
    console.log("Creating admin users with hashed passwords...");

    // Clear existing admin users
    await supabaseAdmin.from("admin_users").delete().neq("id", "");

    // Insert admin users with hashed passwords
    const { error: insertError } = await supabaseAdmin
      .from("admin_users")
      .insert([
        { username: "Iacopo", password_hash: hashedPassword },
        { username: "Gianluca", password_hash: hashedPassword }
      ]);

    if (insertError) {
      console.error("Error inserting admin users:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create admin users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin users created successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Admin users created with hashed passwords" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Setup error:", error);
    return new Response(
      JSON.stringify({ error: "Setup failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
