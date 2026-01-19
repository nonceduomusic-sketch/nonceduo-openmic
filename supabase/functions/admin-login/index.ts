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

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Verify password using PBKDF2 (Web Crypto API compatible with Supabase Edge)
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Handle format: "pbkdf2:iterations:saltHex:hashHex"
  const parts = storedHash.split(":");
  
  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    // Legacy format check: "saltHex:hashHex" (2 parts)
    if (parts.length === 2) {
      const salt = hexToBytes(parts[0]);
      const expectedHash = parts[1];
      
      const encoder = new TextEncoder();
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
          salt: salt.buffer as ArrayBuffer,
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        256
      );
      
      const hashArray = new Uint8Array(derivedBits);
      const computedHash = toHex(hashArray);
      return computedHash === expectedHash;
    }
    
    console.log("Invalid hash format, parts:", parts.length);
    return false;
  }
  
  // Format: pbkdf2:iterations:saltHex:hashHex
  const iterations = parseInt(parts[1], 10) || 100000;
  const salt = hexToBytes(parts[2]);
  const expectedHash = parts[3];
  
  if (!salt || !expectedHash) return false;
  
  const encoder = new TextEncoder();
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
      salt: salt.buffer as ArrayBuffer,
      iterations: iterations,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  
  const hashArray = new Uint8Array(derivedBits);
  const computedHash = toHex(hashArray);
  
  return computedHash === expectedHash;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();
    
    console.log(`Admin login attempt for user: ${username}`);

    if (!username || !password) {
      console.log("Missing username or password");
      return new Response(
        JSON.stringify({ error: "Username e password sono obbligatori" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch admin user from admin_users table
    const { data: adminUser, error: fetchError } = await supabaseAdmin
      .from("admin_users")
      .select("username, password_hash")
      .eq("username", username.trim())
      .maybeSingle();

    if (fetchError) {
      console.error("Database error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Errore durante il login" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!adminUser) {
      console.log("Admin user not found");
      return new Response(
        JSON.stringify({ error: "Credenziali non valide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify password with PBKDF2
    const passwordMatch = await verifyPassword(password, adminUser.password_hash);
    
    if (!passwordMatch) {
      console.log("Password mismatch");
      return new Response(
        JSON.stringify({ error: "Credenziali non valide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a unique email for this admin user (for Supabase Auth)
    const adminEmail = `${username.toLowerCase()}@karaoke-admin.local`;
    
    // Check if Supabase Auth user exists, create if not
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let authUser = existingUsers?.users.find(u => u.email === adminEmail);
    
    if (!authUser) {
      // Create Supabase Auth user for this admin
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: password, // Use same password
        email_confirm: true,
        user_metadata: { username: adminUser.username, is_admin: true }
      });
      
      if (createError) {
        console.error("Error creating auth user:", createError);
        return new Response(
          JSON.stringify({ error: "Errore durante la creazione dell'utente" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      authUser = newUser.user;
      
      // Add admin role to user_roles table (use service role to bypass RLS)
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: authUser.id, role: "admin" }, { onConflict: 'user_id,role' });
      
      if (roleError) {
        console.error("Error adding admin role:", roleError);
      } else {
        console.log("Admin role added for user:", authUser.id);
      }
    } else {
      // Update password if it changed
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: password
      });
    }
    
    console.log(`Admin ${username} authenticated successfully`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        email: adminEmail,
        username: adminUser.username
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Errore interno del server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
