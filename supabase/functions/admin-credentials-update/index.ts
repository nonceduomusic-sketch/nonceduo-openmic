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
      console.log('[admin-credentials-update] No auth header provided');
      return new Response(
        JSON.stringify({ error: 'Non autorizzato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Use supabase client with the user's token to verify identity
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      },
      auth: { persistSession: false },
    });
    
    // Validate JWT using getClaims (local validation, more reliable)
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.log('[admin-credentials-update] Invalid token claims:', claimsError?.message);
      return new Response(
        JSON.stringify({ error: 'Token non valido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log('[admin-credentials-update] Authenticated user:', userId);
    
    // Use service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller is owner
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();

    if (roleError) {
      console.log('[admin-credentials-update] Role check error:', roleError.message);
    }
    
    if (!roleData) {
      console.log('[admin-credentials-update] User is not owner. User roles:', userId);
      return new Response(
        JSON.stringify({ error: 'Solo il proprietario può gestire lo Staff' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-credentials-update] Owner verified, processing action');
    
    const { action, username, password, newUsername, role } = await req.json();

    switch (action) {
      case 'upsertAdmin': {
        // Hash the password
        const passwordHash = await hashPassword(password);
        
        // Check if there's an existing operator with same username - delete it first
        const operatorEmail = `${username.toLowerCase()}@operator.local`;
        const { data: allUsers } = await supabase.auth.admin.listUsers();
        const existingOperator = allUsers?.users.find(u => u.email === operatorEmail);
        
        if (existingOperator) {
          console.log(`[admin-credentials-update] Deleting existing operator to recreate as staff: ${operatorEmail}`);
          await supabase.from('user_roles').delete().eq('user_id', existingOperator.id);
          await supabase.from('user_permissions').delete().eq('user_id', existingOperator.id);
          await supabase.from('profiles').delete().eq('user_id', existingOperator.id);
          await supabase.auth.admin.deleteUser(existingOperator.id);
        }
        
        // Check if admin exists in admin_users table
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
          console.log(`[admin-credentials-update] Updated password for admin: ${username}`);
        } else {
          // Create new
          const { error } = await supabase
            .from('admin_users')
            .insert({ username, password_hash: passwordHash });

          if (error) throw error;
          console.log(`[admin-credentials-update] Created new admin: ${username}`);
        }

        // Update or create Supabase Auth user
        const adminEmail = `${username.toLowerCase()}@karaoke-admin.local`;
        const authUser = allUsers?.users.find(u => u.email === adminEmail);

        if (authUser) {
          await supabase.auth.admin.updateUserById(authUser.id, { password });
          // Update role if specified
          if (role) {
            await supabase.from('user_roles').delete().eq('user_id', authUser.id);
            await supabase.from('user_roles').upsert({ user_id: authUser.id, role }, { onConflict: 'user_id,role' });
          }
          console.log(`[admin-credentials-update] Updated auth user: ${adminEmail}`);
        } else {
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password,
            email_confirm: true,
            user_metadata: { username, is_admin: true }
          });

          if (!createError && newUser?.user) {
            // Assign role
            const userRole = role || (username.toLowerCase() === 'iacopo' ? 'owner' : 'moderator');
            await supabase
              .from('user_roles')
              .upsert({ user_id: newUser.user.id, role: userRole }, { onConflict: 'user_id,role' });
            
            // Create profile
            await supabase
              .from('profiles')
              .upsert({
                user_id: newUser.user.id,
                display_name: username,
                username: username.toLowerCase()
              }, { onConflict: 'user_id' });
              
            console.log(`[admin-credentials-update] Created auth user with role ${userRole}: ${adminEmail}`);
          } else if (createError) {
            console.error(`[admin-credentials-update] Error creating auth user:`, createError);
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

        // Delete Supabase Auth user (try both patterns)
        const adminEmail = `${username.toLowerCase()}@karaoke-admin.local`;
        const operatorEmail = `${username.toLowerCase()}@operator.local`;
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let authUser = existingUsers?.users.find(u => u.email === adminEmail);
        if (!authUser) {
          authUser = existingUsers?.users.find(u => u.email === operatorEmail);
        }

        if (authUser) {
          // Remove user roles
          await supabase.from('user_roles').delete().eq('user_id', authUser.id);
          // Remove user permissions
          await supabase.from('user_permissions').delete().eq('user_id', authUser.id);
          // Remove profile
          await supabase.from('profiles').delete().eq('user_id', authUser.id);
          // Finally delete the auth user
          await supabase.auth.admin.deleteUser(authUser.id);
        }

        console.log(`[admin-credentials-update] Fully deleted admin: ${username}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAdmins': {
        console.log('[admin-credentials-update] Listing all admins...');
        
        const { data: admins, error } = await supabase
          .from('admin_users')
          .select('username, created_at')
          .order('created_at');

        if (error) {
          console.error('[admin-credentials-update] Error listing admins:', error);
          throw error;
        }

        console.log(`[admin-credentials-update] Found ${admins?.length || 0} admins`);

        // Get roles for each admin and FILTER OUT operators
        const { data: allUsers } = await supabase.auth.admin.listUsers();
        
        const adminsWithRoles: Array<{username: string; created_at: string; role: string}> = [];
        
        for (const admin of admins || []) {
          // Try both email patterns
          const adminEmail = `${admin.username.toLowerCase()}@karaoke-admin.local`;
          const operatorEmail = `${admin.username.toLowerCase()}@operator.local`;
          
          let authUser = allUsers?.users.find(u => u.email === adminEmail);
          const isOperatorEmail = !authUser;
          if (!authUser) {
            authUser = allUsers?.users.find(u => u.email === operatorEmail);
          }
          
          let role = 'moderator'; // default
          if (admin.username.toLowerCase() === 'iacopo') {
            role = 'owner';
          }
          
          if (authUser) {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', authUser.id)
              .maybeSingle();
            
            if (roleData) role = roleData.role;
          }
          
          // Skip operators - they belong in the Operators tab, not Staff
          if (role === 'operator') {
            console.log(`[admin-credentials-update] Skipping operator: ${admin.username}`);
            continue;
          }
          
          adminsWithRoles.push({ ...admin, role });
        }

        console.log(`[admin-credentials-update] Returning ${adminsWithRoles.length} staff (excluding operators)`);
        return new Response(
          JSON.stringify({ admins: adminsWithRoles }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        // Create new operator
        if (!username || !password) {
          return new Response(
            JSON.stringify({ error: 'Username e password richiesti' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const operatorEmail = `${username.toLowerCase()}@operator.local`;
        const adminEmail = `${username.toLowerCase()}@karaoke-admin.local`;
        console.log(`[admin-credentials-update] Creating operator: ${operatorEmail}`);
        
        // Check for existing user with same email (either pattern)
        const { data: existingUsersList } = await supabase.auth.admin.listUsers();
        const existingOperator = existingUsersList?.users.find(u => u.email === operatorEmail);
        const existingAdmin = existingUsersList?.users.find(u => u.email === adminEmail);
        
        // If exists, delete it first to allow recreation
        if (existingOperator) {
          console.log(`[admin-credentials-update] Deleting existing operator to recreate: ${operatorEmail}`);
          await supabase.from('user_roles').delete().eq('user_id', existingOperator.id);
          await supabase.from('user_permissions').delete().eq('user_id', existingOperator.id);
          await supabase.from('profiles').delete().eq('user_id', existingOperator.id);
          await supabase.auth.admin.deleteUser(existingOperator.id);
        }
        
        if (existingAdmin) {
          console.log(`[admin-credentials-update] Deleting existing admin to recreate as operator: ${adminEmail}`);
          await supabase.from('admin_users').delete().eq('username', username);
          await supabase.from('user_roles').delete().eq('user_id', existingAdmin.id);
          await supabase.from('user_permissions').delete().eq('user_id', existingAdmin.id);
          await supabase.from('profiles').delete().eq('user_id', existingAdmin.id);
          await supabase.auth.admin.deleteUser(existingAdmin.id);
        }
        
        // Create Supabase Auth user for operator
        const { data: newOperator, error: createError } = await supabase.auth.admin.createUser({
          email: operatorEmail,
          password,
          email_confirm: true,
          user_metadata: { username, is_operator: true }
        });

        if (createError) {
          console.error('[admin-credentials-update] Error creating operator:', createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (newOperator?.user) {
          // Assign operator role
          await supabase
            .from('user_roles')
            .upsert({ user_id: newOperator.user.id, role: 'operator' }, { onConflict: 'user_id,role' });

          // Create profile
          await supabase
            .from('profiles')
            .upsert({
              user_id: newOperator.user.id,
              display_name: username,
              username: username.toLowerCase()
            }, { onConflict: 'user_id' });

          // Assign default operator permissions
          const { data: operatorPerms } = await supabase
            .from('permissions')
            .select('id, name')
            .like('name', 'operator.%');

          if (operatorPerms) {
            const defaultPerms = operatorPerms.filter(p => 
              ['operator.view_centro', 'operator.view_openmic', 'operator.view_dediche', 
               'operator.openmic_readonly', 'operator.dediche_readonly'].includes(p.name)
            );

            for (const perm of defaultPerms) {
              await supabase
                .from('user_permissions')
                .upsert({
                  user_id: newOperator.user.id,
                  permission_id: perm.id,
                  granted: true
                }, { onConflict: 'user_id,permission_id' });
            }
          }

          console.log(`[admin-credentials-update] Created operator: ${username}`);
        }

        return new Response(
          JSON.stringify({ success: true, userId: newOperator?.user?.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateCredentials': {
        // Update username and/or password for any staff/operator
        if (!username) {
          return new Response(
            JSON.stringify({ error: 'Username corrente richiesto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent modifying owner
        if (username.toLowerCase() === 'iacopo') {
          return new Response(
            JSON.stringify({ error: 'Non puoi modificare il proprietario' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[admin-credentials-update] Updating credentials for: ${username}`);

        // Try to find the user in auth (could be admin or operator)
        const adminEmail = `${username.toLowerCase()}@karaoke-admin.local`;
        const operatorEmail = `${username.toLowerCase()}@operator.local`;
        
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        let authUser = existingUsers?.users.find(u => u.email === adminEmail);
        const isOperator = !authUser;
        if (!authUser) {
          authUser = existingUsers?.users.find(u => u.email === operatorEmail);
        }

        if (!authUser) {
          return new Response(
            JSON.stringify({ error: 'Utente non trovato' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if new username is already taken (by either staff or operator)
        if (newUsername && newUsername !== username) {
          const newAdminEmail = `${newUsername.toLowerCase()}@karaoke-admin.local`;
          const newOperatorEmail = `${newUsername.toLowerCase()}@operator.local`;
          const existingNewAdmin = existingUsers?.users.find(u => u.email === newAdminEmail);
          const existingNewOperator = existingUsers?.users.find(u => u.email === newOperatorEmail);
          
          if (existingNewAdmin || existingNewOperator) {
            return new Response(
              JSON.stringify({ error: 'Username già in uso' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Update admin_users if it's a staff member (not operator)
        if (!isOperator) {
          const adminUpdate: Record<string, string> = {};
          if (newUsername && newUsername !== username) {
            adminUpdate.username = newUsername;
          }
          if (password) {
            adminUpdate.password_hash = await hashPassword(password);
          }
          if (Object.keys(adminUpdate).length > 0) {
            await supabase
              .from('admin_users')
              .update(adminUpdate)
              .eq('username', username);
          }
        }

        // Update Supabase Auth user
        const authUpdate: Record<string, any> = {};
        
        if (newUsername && newUsername !== username) {
          const newEmail = isOperator 
            ? `${newUsername.toLowerCase()}@operator.local`
            : `${newUsername.toLowerCase()}@karaoke-admin.local`;
          authUpdate.email = newEmail;
          authUpdate.user_metadata = { ...authUser.user_metadata, username: newUsername };
        }
        
        if (password) {
          authUpdate.password = password;
        }

        if (Object.keys(authUpdate).length > 0) {
          await supabase.auth.admin.updateUserById(authUser.id, authUpdate);
          console.log(`[admin-credentials-update] Updated auth user for: ${username}`);
        }

        // Update profile if username changed
        if (newUsername && newUsername !== username) {
          await supabase
            .from('profiles')
            .update({ 
              display_name: newUsername, 
              username: newUsername.toLowerCase() 
            })
            .eq('user_id', authUser.id);
        }

        console.log(`[admin-credentials-update] Updated credentials for: ${username} -> ${newUsername || username}`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deleteOperator': {
        // Full deletion of an operator
        if (!username) {
          return new Response(
            JSON.stringify({ error: 'Username richiesto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const operatorEmail = `${username.toLowerCase()}@operator.local`;
        console.log(`[admin-credentials-update] Deleting operator: ${operatorEmail}`);
        
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const authUser = existingUsers?.users.find(u => u.email === operatorEmail);

        if (authUser) {
          // Remove user roles
          await supabase.from('user_roles').delete().eq('user_id', authUser.id);
          // Remove user permissions
          await supabase.from('user_permissions').delete().eq('user_id', authUser.id);
          // Remove profile
          await supabase.from('profiles').delete().eq('user_id', authUser.id);
          // Finally delete the auth user
          await supabase.auth.admin.deleteUser(authUser.id);
          console.log(`[admin-credentials-update] Fully deleted operator: ${username}`);
        } else {
          console.log(`[admin-credentials-update] Operator not found: ${operatorEmail}`);
        }

        return new Response(
          JSON.stringify({ success: true }),
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
    console.error('[admin-credentials-update] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
