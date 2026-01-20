import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Extract JWT token from Authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Use getClaims to verify JWT locally (more reliable than getUser which requires network call)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email || 'unknown';
    console.log(`Admin chat request from user: ${userEmail}`);

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin role via user_roles table (not user_metadata which is client-controllable)
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;
    console.log(`Admin chat action: ${action} by ${userEmail}`);

    let result;

    switch (action) {
      case 'sendMessage': {
        const { conversation_id, message_text } = body;
        result = await supabase
          .from('chat_messages')
          .insert([{
            conversation_id,
            sender_type: 'admin',
            sender_name: claimsData.claims.user_metadata?.username || 'Staff',
            sender_session_id: null,
            message_text,
          }]);
        break;
      }

      case 'editMessage': {
        const { message_id, message_text } = body;
        result = await supabase
          .from('chat_messages')
          .update({ 
            message_text,
            edited_at: new Date().toISOString()
          })
          .eq('id', message_id);
        break;
      }

      case 'deleteMessage': {
        const { message_id } = body;
        result = await supabase
          .from('chat_messages')
          .delete()
          .eq('id', message_id);
        break;
      }

      case 'deleteConversation': {
        const { conversation_id } = body;
        // This will cascade delete messages and participants
        result = await supabase
          .from('conversations')
          .delete()
          .eq('id', conversation_id);
        break;
      }

      case 'mergeConversations': {
        const { conversation_ids, group_name } = body;
        
        if (!conversation_ids || conversation_ids.length < 2) {
          return new Response(
            JSON.stringify({ error: 'Servono almeno 2 conversazioni' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create new group conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert([{ 
            name: group_name || 'Gruppo', 
            is_group: true 
          }])
          .select()
          .single();

        if (convError) {
          console.error('Error creating group:', convError);
          return new Response(
            JSON.stringify({ error: convError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all participants from conversations to merge
        const { data: existingParticipants, error: partError } = await supabase
          .from('conversation_participants')
          .select('*')
          .in('conversation_id', conversation_ids);

        if (partError) {
          console.error('Error fetching participants:', partError);
          return new Response(
            JSON.stringify({ error: partError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add unique participants to new group (dedupe by session_id)
        const uniqueParticipants = new Map();
        for (const p of existingParticipants || []) {
          if (!uniqueParticipants.has(p.session_id)) {
            uniqueParticipants.set(p.session_id, {
              conversation_id: newConv.id,
              participant_name: p.participant_name,
              session_id: p.session_id,
            });
          }
        }

        if (uniqueParticipants.size > 0) {
          const { error: insertPartError } = await supabase
            .from('conversation_participants')
            .insert(Array.from(uniqueParticipants.values()));

          if (insertPartError) {
            console.error('Error adding participants:', insertPartError);
          }
        }

        // Get all messages from conversations to merge
        const { data: existingMessages, error: msgError } = await supabase
          .from('chat_messages')
          .select('*')
          .in('conversation_id', conversation_ids)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('Error fetching messages:', msgError);
          return new Response(
            JSON.stringify({ error: msgError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Copy messages to new conversation (without id to get new ids)
        if (existingMessages && existingMessages.length > 0) {
          const messagesToInsert = existingMessages.map(m => ({
            conversation_id: newConv.id,
            sender_type: m.sender_type,
            sender_name: m.sender_name,
            sender_session_id: m.sender_session_id,
            message_text: m.message_text,
            edited_at: m.edited_at,
            created_at: m.created_at, // Preserve original timestamp
          }));

          const { error: insertMsgError } = await supabase
            .from('chat_messages')
            .insert(messagesToInsert);

          if (insertMsgError) {
            console.error('Error copying messages:', insertMsgError);
          }
        }

        // Delete old conversations
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .in('id', conversation_ids);

        if (deleteError) {
          console.error('Error deleting old conversations:', deleteError);
        }

        result = { data: newConv, error: null };
        break;
      }

      case 'renameGroup': {
        const { conversation_id, name } = body;
        result = await supabase
          .from('conversations')
          .update({ name })
          .eq('id', conversation_id);
        break;
      }

      case 'setVisibility': {
        const { conversation_id, is_public, allowed_participants } = body;
        result = await supabase
          .from('conversations')
          .update({ 
            is_public: is_public ?? false,
            allowed_participants: allowed_participants ?? []
          })
          .eq('id', conversation_id)
          .eq('is_group', true); // Only groups can have visibility settings
        break;
      }

      case 'bulkDeleteConversations': {
        const { conversation_ids } = body;
        if (!conversation_ids || conversation_ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Nessuna conversazione selezionata' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        result = await supabase
          .from('conversations')
          .delete()
          .in('id', conversation_ids);
        break;
      }

      case 'blockUser': {
        const { session_id, reason, expires_in_hours } = body;
        if (!session_id) {
          return new Response(
            JSON.stringify({ error: 'Session ID richiesto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const expiresAt = expires_in_hours 
          ? new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()
          : null;

        result = await supabase
          .from('blocked_users')
          .upsert([{
            session_id,
            blocked_by: userId,
            reason: reason || 'Violazione regole',
            expires_at: expiresAt,
          }], { onConflict: 'session_id' });
        break;
      }

      case 'unblockUser': {
        const { session_id } = body;
        if (!session_id) {
          return new Response(
            JSON.stringify({ error: 'Session ID richiesto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = await supabase
          .from('blocked_users')
          .delete()
          .eq('session_id', session_id);
        break;
      }

      case 'getBlockedUsers': {
        const { data, error } = await supabase
          .from('blocked_users')
          .select('*')
          .order('blocked_at', { ascending: false });
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result?.error) {
      console.error(`Error in ${action}:`, result.error);
      return new Response(
        JSON.stringify({ error: result.error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: result?.data }),
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
