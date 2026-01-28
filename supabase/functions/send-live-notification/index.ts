import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "openmic" | "dediche";
  reservationId?: string;
  customerName: string;
  songTitle?: string;
  songArtist?: string;
  dedicationMessage?: string;
  isTest?: boolean;
}

const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString("it-IT", { 
    hour: "2-digit", 
    minute: "2-digit",
    timeZone: "Europe/Rome" 
  });
};

const buildOpenMicMessage = (data: NotificationRequest, format: "text" | "markdown") => {
  const time = formatTime();
  
  if (format === "markdown") {
    let msg = `🎤 *OPEN MIC*\n\n`;
    msg += `📀 *Canzone:* ${data.songTitle} - ${data.songArtist}\n`;
    msg += `👤 *Prenotato da:* ${data.customerName}\n`;
    if (data.dedicationMessage) {
      msg += `💌 *Dedica:* ${data.dedicationMessage}\n`;
    }
    msg += `\n⏰ ${time}`;
    return msg;
  }
  
  let msg = `🎤 OPEN MIC\n\n`;
  msg += `Canzone: ${data.songTitle} - ${data.songArtist}\n`;
  msg += `Prenotato da: ${data.customerName}\n`;
  if (data.dedicationMessage) {
    msg += `Dedica: ${data.dedicationMessage}\n`;
  }
  msg += `\nOra: ${time}`;
  return msg;
};

const buildDedicheMessage = (data: NotificationRequest, format: "text" | "markdown") => {
  const time = formatTime();
  
  if (format === "markdown") {
    let msg = `💌 *DEDICA*\n\n`;
    msg += `👤 *Da:* ${data.customerName}\n`;
    msg += `📝 *Messaggio:*\n${data.dedicationMessage}\n`;
    msg += `\n⏰ ${time}`;
    return msg;
  }
  
  let msg = `💌 DEDICA\n\n`;
  msg += `Da: ${data.customerName}\n`;
  msg += `Messaggio:\n${data.dedicationMessage}\n`;
  msg += `\nOra: ${time}`;
  return msg;
};

const buildEmailHtml = (data: NotificationRequest) => {
  const time = formatTime();
  
  if (data.type === "openmic") {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px;">🎤 OPEN MIC</h1>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 10px 0;"><strong>📀 Canzone:</strong> ${data.songTitle} - ${data.songArtist}</p>
          <p style="margin: 10px 0;"><strong>👤 Prenotato da:</strong> ${data.customerName}</p>
          ${data.dedicationMessage ? `<p style="margin: 10px 0;"><strong>💌 Dedica:</strong> ${data.dedicationMessage}</p>` : ''}
        </div>
        <p style="color: #666; font-size: 14px;">⏰ ${time}</p>
      </div>
    `;
  }
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #ec4899; border-bottom: 2px solid #ec4899; padding-bottom: 10px;">💌 DEDICA</h1>
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 10px 0;"><strong>👤 Da:</strong> ${data.customerName}</p>
        <p style="margin: 10px 0;"><strong>📝 Messaggio:</strong></p>
        <blockquote style="border-left: 3px solid #ec4899; padding-left: 15px; margin: 15px 0; color: #333;">
          ${data.dedicationMessage}
        </blockquote>
      </div>
      <p style="color: #666; font-size: 14px;">⏰ ${time}</p>
    </div>
  `;
};

const sendTelegramMessage = async (
  botToken: string, 
  chatId: string, 
  message: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );
    
    const result = await response.json();
    
    if (!result.ok) {
      console.error("Telegram API error:", result);
      return { success: false, error: result.description || "Unknown error" };
    }
    
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Telegram send error:", error);
    return { success: false, error: error.message };
  }
};

const sendEmailViaResend = async (
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> => {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return { success: false, error: "Resend API Key non configurata" };
  }

  try {
    const resend = new Resend(resendApiKey);
    
    const { data, error } = await resend.emails.send({
      from: "NON C'È DUO Live <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("Resend API error:", error);
      return { success: false, error: error.message };
    }
    
    console.log("Email sent successfully via Resend:", data);
    return { success: true };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Resend error:", error);
    return { success: false, error: error.message };
  }
};

const logNotification = async (
  supabase: any,
  type: string,
  channel: string,
  recipient: string,
  subject: string | null,
  messageBody: string,
  status: string,
  errorMessage: string | null,
  reservationId: string | null
) => {
  try {
    await supabase.from("notification_logs").insert({
      notification_type: type,
      channel,
      recipient,
      subject,
      message_body: messageBody,
      status,
      error_message: errorMessage,
      reservation_id: reservationId,
    });
  } catch (error) {
    console.error("Failed to log notification:", error);
  }
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const data: NotificationRequest = await req.json();
    console.log("Received notification request:", data);

    // Fetch notification settings
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("*")
      .limit(1)
      .single();

    if (settingsError) {
      console.error("Failed to fetch settings:", settingsError);
      throw new Error("Failed to fetch notification settings");
    }

    const results = {
      telegram: { sent: false, error: null as string | null },
      email: { sent: false, error: null as string | null },
    };

    // Determine which notifications to send based on type and settings
    const isOpenMic = data.type === "openmic";
    const chatId = isOpenMic ? settings.telegram_openmic_chat_id : settings.telegram_dediche_chat_id;
    
    // Check if Telegram should be sent
    const shouldSendTelegram = settings.telegram_enabled && 
      (isOpenMic ? settings.openmic_telegram_enabled : settings.dediche_telegram_enabled);
    
    // Check if Email should be sent
    const shouldSendEmail = settings.email_enabled && 
      (isOpenMic ? settings.openmic_email_enabled : settings.dediche_email_enabled);

    // Build messages
    const telegramMessage = isOpenMic 
      ? buildOpenMicMessage(data, "markdown")
      : buildDedicheMessage(data, "markdown");
    
    const emailSubject = isOpenMic 
      ? `🎤 Open Mic: ${data.songTitle} - ${data.songArtist}`
      : `💌 Nuova Dedica da ${data.customerName}`;
    
    const emailHtml = buildEmailHtml(data);

    // Send Telegram notification
    if (shouldSendTelegram) {
      console.log(`Sending Telegram to chat ${chatId}`);
      const telegramResult = await sendTelegramMessage(telegramBotToken, chatId, telegramMessage);
      results.telegram = { sent: telegramResult.success, error: telegramResult.error || null };
      
      await logNotification(
        supabase,
        data.type,
        "telegram",
        chatId,
        null,
        telegramMessage,
        telegramResult.success ? "sent" : "failed",
        telegramResult.error || null,
        data.reservationId || null
      );
    }

    // Send Email notification via Gmail SMTP
    if (shouldSendEmail) {
      console.log(`Sending Email to ${settings.email_recipient}`);
      const emailResult = await sendEmailViaResend(settings.email_recipient, emailSubject, emailHtml);
      results.email = { sent: emailResult.success, error: emailResult.error || null };
      
      await logNotification(
        supabase,
        data.type,
        "email",
        settings.email_recipient,
        emailSubject,
        emailHtml,
        emailResult.success ? "sent" : "failed",
        emailResult.error || null,
        data.reservationId || null
      );
    }

    console.log("Notification results:", results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        settings: {
          telegramEnabled: shouldSendTelegram,
          emailEnabled: shouldSendEmail,
        }
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error in send-live-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  }
});
