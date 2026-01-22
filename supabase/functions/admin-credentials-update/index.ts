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

// Hash password using PBKDF2
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 100000;
  
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
  return `pbkdf2:${iterations}:${toHex(salt)}:${toHex(hashArray)}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorizzato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the caller is an owner
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Token non valido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is owner
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Solo il proprietario può modificare le credenziali' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, username, password, newUsername, role } = await req.json();

    switch (action) {
      case 'upsertAdmin': {
        // Hash the password
        const passwordHash = await hashPassword(password);
        
        // Check if admin exists
        const { data: existing } = await supabase
          .from('admin_users')
          .select('id')
          .eq('username', username)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('admin_users')
            .update({ password_hash: passwordHash })
            .eq('username', username);

          if (error) throw error;
          console.log(`Updated password for admin: ${username}`);
        } else {
          // Create new
          const { error } = await supabase
            .from('admin_users')
            .insert({ username, password_hash: passwordHash });

          if (error) throw error;
          console.log(`Created new admin: ${username}`);
        }

        // Update or create Supabase Auth user
        const adminEmail = `${username.toLowerCase()}@karaoke-admin.local`;
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const authUser = existingUsers?.users.find(u => u.email === adminEmail);

        if (authUser) {
          await supabase.auth.admin.updateUserById(authUser.id, { password });
        } else {
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password,
            email_confirm: true,
            user_metadata: { username, is_admin: true }
          });

          if (!createError && newUser?.user) {
            // Assign role
            const userRole = role || (username.toLowerCase() === 'iacopo' ? 'owner' : 'admin');
            await supabase
              .from('user_roles')
              .upsert({ user_id: newUser.user.id, role: userRole }, { onConflict: 'user_id,role' });
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deleteAdmin': {
        // Prevent deleting owner
        if (username.toLowerCase() === 'iacopo') {
          return new Response(
            JSON.stringify({ error: 'Non puoi eliminare il proprietario' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete from admin_users
        await supabase
          .from('admin_users')
          .delete()
          .eq('username', username);

        // Delete Supabase Auth user
        const adminEmail = `${username.toLowerCase()}@karaoke-admin.local`;
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const authUser = existingUsers?.users.find(u => u.email === adminEmail);

        if (authUser) {
          await supabase.auth.admin.deleteUser(authUser.id);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAdmins': {
        const { data: admins, error } = await supabase
          .from('admin_users')
          .select('username, created_at')
          .order('created_at');

        if (error) throw error;

        // Get roles for each admin
        const adminsWithRoles = await Promise.all(
          (admins || []).map(async (admin) => {
            const adminEmail = `${admin.username.toLowerCase()}@karaoke-admin.local`;
            const { data: users } = await supabase.auth.admin.listUsers();
            const authUser = users?.users.find(u => u.email === adminEmail);
            
            let role = 'admin';
            if (authUser) {
              const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', authUser.id)
                .maybeSingle();
              
              if (roleData) role = roleData.role;
            }
            
            return { ...admin, role };
          })
        );

        return new Response(
          JSON.stringify({ admins: adminsWithRoles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Azione non valida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
