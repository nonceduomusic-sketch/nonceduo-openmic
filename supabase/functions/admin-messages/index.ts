import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the user's JWT token (same pattern as admin-reservations)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role via user_roles table (not user_metadata which is client-controllable)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { action, id, ids, reply, message } = await req.json();
    console.log(`Admin message action: ${action} by ${user.email}`);

    let result;

    switch (action) {
      case 'markAsRead':
        result = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('id', id);
        break;

      case 'markAsUnread':
        result = await supabase
          .from('messages')
          .update({ is_read: false })
          .eq('id', id);
        break;

      case 'reply':
        result = await supabase
          .from('messages')
          .update({ 
            admin_reply: reply,
            replied_at: new Date().toISOString(),
            is_read: true 
          })
          .eq('id', id);
        break;

      case 'delete':
        result = await supabase
          .from('messages')
          .delete()
          .eq('id', id);
        break;

      case 'deleteMultiple':
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'IDs messaggi mancanti' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await supabase
          .from('messages')
          .delete()
          .in('id', ids);
        break;

      case 'restore':
        result = await supabase
          .from('messages')
          .insert([{
            id: message.id,
            sender_name: message.sender_name,
            message_text: message.message_text,
            is_read: message.is_read,
            admin_reply: message.admin_reply,
            replied_at: message.replied_at,
            created_at: message.created_at,
          }]);
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result.error) {
      console.error(`Error in ${action}:`, result.error);
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
