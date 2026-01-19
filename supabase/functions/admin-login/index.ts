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

// Verify password using PBKDF2 (Web Crypto API compatible with Supabase Edge)
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, expectedHash] = storedHash.split(":");
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
      salt: encoder.encode(salt),
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
      
      // Add admin role to user_roles table
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: authUser.id, role: "admin" });
      
      if (roleError) {
        console.error("Error adding admin role:", roleError);
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
