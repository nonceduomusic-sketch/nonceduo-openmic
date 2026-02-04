import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { conversationId, messageText, userName, sourceSection, songRequest, isComplete } = await req.json();

    console.log('Received notification request:', { conversationId, userName, sourceSection, isComplete });

    // Get assistant settings
    const { data: settings, error: settingsError } = await supabase
      .from('assistant_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching settings:', settingsError);
      return new Response(JSON.stringify({ success: false, error: 'Settings not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if Telegram is enabled
    if (!settings.telegram_enabled || !settings.telegram_chat_id) {
      console.log('Telegram notifications disabled or no chat ID');
      return new Response(JSON.stringify({ success: false, reason: 'Telegram disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check section-specific notification settings
    const sectionMap: Record<string, string> = {
      'site': 'notify_site',
      'openmic': 'notify_openmic',
      'dediche': 'notify_dediche',
      'community': 'notify_community',
    };

    const notifyKey = sectionMap[sourceSection?.toLowerCase()] || 'notify_site';
    if (!settings[notifyKey]) {
      console.log(`Notifications disabled for section: ${sourceSection}`);
      return new Response(JSON.stringify({ success: false, reason: `Notifications disabled for ${sourceSection}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get message count for this conversation to determine if this is first message
    const { count } = await supabase
      .from('assistant_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'user');

    const isFirstMessage = (count || 0) <= 1;

    // Format message with clear section identification
    const sectionLabels: Record<string, { emoji: string; name: string }> = {
      'site': { emoji: '🌐', name: 'SITO GENERALE' },
      'openmic': { emoji: '🎤', name: 'OPEN MIC' },
      'dediche': { emoji: '💌', name: 'DEDICHE' },
      'community': { emoji: '👥', name: 'COMMUNITY' },
    };

    const section = sectionLabels[sourceSection?.toLowerCase()] || { emoji: '💬', name: 'SITO' };
    
    let telegramMessage: string;

    // If it's a complete song request, send a nicely formatted message
    if (isComplete && songRequest) {
      telegramMessage = `🎵 *RICHIESTA CANZONE*
━━━━━━━━━━━━━━━━━━
${section.emoji} *Provenienza:* ${section.name}
━━━━━━━━━━━━━━━━━━

👤 *Utente:* ${songRequest.name || userName || 'Anonimo'}
🎵 *Titolo:* ${songRequest.title || 'Non specificato'}
🎤 *Artista:* ${songRequest.artist || 'Non specificato'}

⏰ ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}

💬 _Rispondi dal pannello Admin → Assistente_`;
    } else if (isFirstMessage) {
      // First message from a new conversation
      telegramMessage = `🆕 *NUOVA CONVERSAZIONE*
━━━━━━━━━━━━━━━━━━
${section.emoji} *Provenienza:* ${section.name}
━━━━━━━━━━━━━━━━━━

👤 *Utente:* ${userName || 'Visitatore anonimo'}

💬 *Primo messaggio:*
"${messageText}"

⏰ ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}

📱 _Rispondi dal pannello Admin → Assistente_`;
    } else {
      // Follow-up messages - shorter format
      telegramMessage = `💬 *NUOVO MESSAGGIO*
${section.emoji} ${section.name}

👤 ${userName || 'Visitatore'}:
"${messageText}"

⏰ ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`;
    }

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const telegramResponse = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text: telegramMessage,
        parse_mode: 'Markdown',
      }),
    });

    const telegramResult = await telegramResponse.json();
    
    if (!telegramResponse.ok) {
      console.error('Telegram API error:', telegramResult);
      return new Response(JSON.stringify({ success: false, error: telegramResult }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Telegram notification sent successfully');
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in assistant-telegram:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});