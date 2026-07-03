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

    // Rate limiting: max 5 failed attempts per 15 minutes per IP+username
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const rateLimitId = `admin_login:${clientIp}:${username.trim().toLowerCase()}`;
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { count: recentFailures } = await supabaseAdmin
      .from("security_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("identifier", rateLimitId)
      .eq("action_type", "admin_login")
      .eq("success", false)
      .gte("attempted_at", fifteenMinAgo);

    if ((recentFailures ?? 0) >= 5) {
      console.log(`Rate limit exceeded for ${rateLimitId}`);
      await supabaseAdmin.from("security_rate_limits").insert({
        identifier: rateLimitId,
        action_type: "admin_login_blocked",
        success: false,
      });
      return new Response(
        JSON.stringify({ error: "Troppi tentativi. Riprova tra 15 minuti." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const logAttempt = async (success: boolean) => {
      try {
        await supabaseAdmin.from("security_rate_limits").insert({
          identifier: rateLimitId,
          action_type: "admin_login",
          success,
        });
      } catch (e) {
        console.error("Failed to log rate-limit attempt:", e);
      }
    };
    
    // First, check if this is an operator (check Auth user with @operator.local email)
    const operatorEmail = `${trimmedUsername}@operator.local`;
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const operatorAuthUser = existingUsers?.users.find(u => u.email === operatorEmail);
    
    if (operatorAuthUser) {
      // This is an operator - verify password directly via Supabase Auth
      console.log(`Found operator account: ${operatorEmail}`);
      
      // Try to sign in with the provided password to verify it
      // We use a workaround: update password and if it matches, Auth will accept it
      // Actually, we can verify by attempting signInWithPassword via a temp client
      const tempClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      
      const { data: signInData, error: signInError } = await tempClient.auth.signInWithPassword({
        email: operatorEmail,
        password: password
      });
      
      if (signInError || !signInData.user) {
        console.log("Operator password mismatch:", signInError?.message);
        return new Response(
          JSON.stringify({ error: "Credenziali non valide" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Verify this user actually has the operator role
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", operatorAuthUser.id)
        .eq("role", "operator")
        .maybeSingle();
      
      if (!roleData) {
        console.log("User exists but doesn't have operator role");
        return new Response(
          JSON.stringify({ error: "Credenziali non valide" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Operator ${trimmedUsername} authenticated successfully`);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          email: operatorEmail,
          username: operatorAuthUser.user_metadata?.username || trimmedUsername,
          isOperator: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Not an operator, check admin_users table for staff login
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
    const adminEmail = `${adminUser.username.toLowerCase()}@karaoke-admin.local`;
    
    // Check if Supabase Auth user exists, create if not
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
      
      // Determine role: Iacopo is owner, Gianluca is admin, others are moderators (staff)
      let userRole = 'moderator';
      if (adminUser.username.toLowerCase() === 'iacopo') {
        userRole = 'owner';
      } else if (adminUser.username.toLowerCase() === 'gianluca') {
        userRole = 'admin';
      }
      
      // Add role to user_roles table (use service role to bypass RLS)
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: authUser.id, role: userRole }, { onConflict: 'user_id,role' });
      
      if (roleError) {
        console.error("Error adding role:", roleError);
      } else {
        console.log(`Role '${userRole}' added for user:`, authUser.id);
      }
    } else {
      // Update password if it changed
      await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: password
      });
      
      // Ensure Iacopo has owner role (upgrade existing admin to owner)
      if (adminUser.username.toLowerCase() === 'iacopo') {
        // Remove admin role if exists, add owner
        await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq('user_id', authUser.id)
          .eq('role', 'admin');
          
        const { error: ownerError } = await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: authUser.id, role: 'owner' }, { onConflict: 'user_id,role' });
          
        if (!ownerError) {
          console.log("Upgraded Iacopo to owner role");
        }
      }
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
