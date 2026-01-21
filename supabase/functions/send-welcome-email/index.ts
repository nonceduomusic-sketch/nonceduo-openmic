import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  displayName: string;
  username: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-welcome-email function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, displayName, username }: WelcomeEmailRequest = await req.json();
    
    console.log(`Sending welcome email to: ${email} for user: ${displayName}`);

    if (!email || !displayName) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Email and displayName are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailResponse = await resend.emails.send({
      from: "Non Ce Duo <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 Benvenuto nella Community Non Ce Duo!",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #333;">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #e11d48; font-size: 28px; margin: 0; font-weight: bold;">NON CE DUO</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 8px;">Community</p>
      </div>
      
      <!-- Welcome message -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">Benvenuto ${displayName}! 🎉</h2>
        <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0;">
          Il tuo account è stato creato con successo. Ora fai parte della nostra community!
        </p>
      </div>
      
      <!-- Account info box -->
      <div style="background-color: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0;">📋 Riepilogo Account</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Email</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${email}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Username</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">@${username}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 8px 0; font-size: 14px;">Nome visualizzato</td>
            <td style="color: #ffffff; padding: 8px 0; font-size: 14px; text-align: right;">${displayName}</td>
          </tr>
        </table>
      </div>
      
      <!-- What you can do -->
      <div style="margin-bottom: 32px;">
        <h3 style="color: #ffffff; font-size: 16px; margin: 0 0 16px 0;">✨ Cosa puoi fare</h3>
        <ul style="color: #94a3b8; font-size: 14px; line-height: 2; padding-left: 20px; margin: 0;">
          <li>Chatta con altri membri della community</li>
          <li>Contatta lo staff direttamente</li>
          <li>Partecipa ai gruppi pubblici</li>
          <li>Resta aggiornato sugli eventi</li>
        </ul>
      </div>
      
      <!-- Security note -->
      <div style="background-color: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 8px; padding: 16px; margin-bottom: 32px;">
        <p style="color: #eab308; font-size: 13px; margin: 0; line-height: 1.5;">
          🔒 <strong>Nota di sicurezza:</strong> Non condividiamo mai la tua password via email. Se ricevi richieste di password, ignorale.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="text-align: center; border-top: 1px solid #333; padding-top: 24px;">
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          Questa email è stata inviata automaticamente da Non Ce Duo.<br>
          Se non hai creato questo account, puoi ignorare questa email.
        </p>
      </div>
      
    </div>
  </div>
</body>
</html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
