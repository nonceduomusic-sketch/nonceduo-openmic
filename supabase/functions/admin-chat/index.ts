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

      case 'restoreMessage': {
        // Restore a deleted message
        const { message } = body;
        
        if (!message) {
          return new Response(
            JSON.stringify({ error: 'Dati messaggio mancanti' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('chat_messages')
          .insert([{
            id: message.id,
            conversation_id: message.conversation_id,
            sender_type: message.sender_type,
            sender_name: message.sender_name,
            sender_session_id: message.sender_session_id,
            message_text: message.message_text,
            edited_at: message.edited_at,
            created_at: message.created_at,
          }])
          .select()
          .single();

        if (error) {
          console.error('Error restoring message:', error);
          return new Response(
            JSON.stringify({ error: 'Errore nel ripristino del messaggio' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { data, error: null };
        break;
      }

      case 'bulkDeleteMessages': {
        // Delete multiple messages at once
        const { message_ids } = body;
        if (!message_ids || message_ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Nessun messaggio selezionato' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        result = await supabase
          .from('chat_messages')
          .delete()
          .in('id', message_ids);
        break;
      }

      case 'bulkRestoreMessages': {
        // Restore multiple deleted messages
        const { messages: messagesToRestore } = body;
        
        if (!messagesToRestore || messagesToRestore.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Nessun messaggio da ripristinare' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const messagesToInsert = messagesToRestore.map((m: any) => ({
          id: m.id,
          conversation_id: m.conversation_id,
          sender_type: m.sender_type,
          sender_name: m.sender_name,
          sender_session_id: m.sender_session_id,
          message_text: m.message_text,
          edited_at: m.edited_at,
          created_at: m.created_at,
        }));

        const { data, error } = await supabase
          .from('chat_messages')
          .insert(messagesToInsert);

        if (error) {
          console.error('Error restoring messages:', error);
          return new Response(
            JSON.stringify({ error: 'Errore nel ripristino dei messaggi' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { data: { restored: messagesToRestore.length }, error: null };
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

      case 'createGroup': {
        // Create a new empty group - optionally add participants from selected conversations
        const { conversation_ids, group_name, is_public } = body;
        
        // conversation_ids is now optional - can create empty group
        const convIds = conversation_ids || [];

        // Create new group conversation (empty, no messages copied)
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert([{ 
            name: group_name || 'Gruppo', 
            is_group: true,
            is_public: is_public ?? false
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

        // If conversation_ids provided, get all participants from those conversations
        if (convIds.length > 0) {
          const { data: existingParticipants, error: partError } = await supabase
            .from('conversation_participants')
            .select('*')
            .in('conversation_id', convIds);

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
        }

        // DO NOT copy messages - the group starts empty
        // The original individual conversations remain untouched

        result = { data: newConv, error: null };
        break;
      }

      case 'addToGroup': {
        // Add participants from conversations to an existing group
        const { group_id, conversation_ids } = body;
        
        if (!group_id) {
          return new Response(
            JSON.stringify({ error: 'ID gruppo richiesto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!conversation_ids || conversation_ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Seleziona almeno una conversazione' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verify the target is a group
        const { data: groupData, error: groupError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', group_id)
          .eq('is_group', true)
          .single();

        if (groupError || !groupData) {
          return new Response(
            JSON.stringify({ error: 'Gruppo non trovato' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get existing group participants
        const { data: existingGroupParticipants } = await supabase
          .from('conversation_participants')
          .select('session_id')
          .eq('conversation_id', group_id);

        const existingSessionIds = new Set((existingGroupParticipants || []).map(p => p.session_id));

        // Get participants from selected conversations
        const { data: newParticipants, error: partError } = await supabase
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

        // Add only new participants (not already in group)
        const participantsToAdd = [];
        const addedSessionIds = new Set<string>();
        
        for (const p of newParticipants || []) {
          if (!existingSessionIds.has(p.session_id) && !addedSessionIds.has(p.session_id)) {
            addedSessionIds.add(p.session_id);
            participantsToAdd.push({
              conversation_id: group_id,
              participant_name: p.participant_name,
              session_id: p.session_id,
            });
          }
        }

        if (participantsToAdd.length > 0) {
          const { error: insertError } = await supabase
            .from('conversation_participants')
            .insert(participantsToAdd);

          if (insertError) {
            console.error('Error adding participants:', insertError);
            return new Response(
              JSON.stringify({ error: insertError.message }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        result = { data: { added: participantsToAdd.length }, error: null };
        break;
      }

      case 'removeFromGroup': {
        // Remove a participant from a group
        const { group_id, session_id } = body;
        
        if (!group_id || !session_id) {
          return new Response(
            JSON.stringify({ error: 'ID gruppo e session_id richiesti' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('conversation_participants')
          .delete()
          .eq('conversation_id', group_id)
          .eq('session_id', session_id);

        if (error) {
          console.error('Error removing participant:', error);
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = { data: { removed: true }, error: null };
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

      case 'restoreConversation': {
        // Restore a deleted conversation with all its data
        const { conversation, participants, messages } = body;
        
        if (!conversation) {
          return new Response(
            JSON.stringify({ error: 'Dati conversazione mancanti' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Re-insert the conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert([{
            id: conversation.id,
            name: conversation.name,
            is_group: conversation.is_group,
            is_public: conversation.is_public ?? false,
            allowed_participants: conversation.allowed_participants ?? [],
            created_at: conversation.created_at,
            updated_at: conversation.updated_at,
          }])
          .select()
          .single();

        if (convError) {
          console.error('Error restoring conversation:', convError);
          return new Response(
            JSON.stringify({ error: 'Errore nel ripristino della conversazione' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Re-insert participants if any
        if (participants && participants.length > 0) {
          const participantsToInsert = participants.map((p: any) => ({
            id: p.id,
            conversation_id: conversation.id,
            participant_name: p.participant_name,
            session_id: p.session_id,
            joined_at: p.joined_at,
          }));

          const { error: partError } = await supabase
            .from('conversation_participants')
            .insert(participantsToInsert);

          if (partError) {
            console.error('Error restoring participants:', partError);
          }
        }

        // Re-insert messages if any
        if (messages && messages.length > 0) {
          const messagesToInsert = messages.map((m: any) => ({
            id: m.id,
            conversation_id: conversation.id,
            sender_type: m.sender_type,
            sender_name: m.sender_name,
            sender_session_id: m.sender_session_id,
            message_text: m.message_text,
            edited_at: m.edited_at,
            created_at: m.created_at,
          }));

          const { error: msgError } = await supabase
            .from('chat_messages')
            .insert(messagesToInsert);

          if (msgError) {
            console.error('Error restoring messages:', msgError);
          }
        }

        result = { data: newConv, error: null };
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

      case 'markAsRead': {
        const { conversation_id } = body;
        if (!conversation_id) {
          return new Response(
            JSON.stringify({ error: 'ID conversazione richiesto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = await supabase
          .from('conversations')
          .update({ is_read: true })
          .eq('id', conversation_id);
        break;
      }

      case 'markAsUnread': {
        const { conversation_id } = body;
        if (!conversation_id) {
          return new Response(
            JSON.stringify({ error: 'ID conversazione richiesto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        result = await supabase
          .from('conversations')
          .update({ is_read: false })
          .eq('id', conversation_id);
        break;
      }

      case 'markMessagesAsRead': {
        // Mark all messages in a conversation as read by admin
        const { conversation_id } = body;
        if (!conversation_id) {
          return new Response(
            JSON.stringify({ error: 'ID conversazione richiesto' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mark user messages as read (admin viewing them)
        result = await supabase
          .from('chat_messages')
          .update({ 
            status: 'read',
            read_at: new Date().toISOString()
          })
          .eq('conversation_id', conversation_id)
          .eq('sender_type', 'user')
          .neq('status', 'read');
        break;
      }

      case 'updateMessageStatus': {
        // Update the status of specific messages
        const { message_ids, status } = body;
        if (!message_ids || message_ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'ID messaggi richiesti' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (!['sent', 'delivered', 'read'].includes(status)) {
          return new Response(
            JSON.stringify({ error: 'Stato non valido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: any = { status };
        if (status === 'read') {
          updateData.read_at = new Date().toISOString();
        }

        result = await supabase
          .from('chat_messages')
          .update(updateData)
          .in('id', message_ids);
        break;
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
