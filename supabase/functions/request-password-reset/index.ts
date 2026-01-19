import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate a secure token
    const token = crypto.randomUUID() + "-" + crypto.randomUUID();
    
    // Get any admin user to create the reset token (we'll allow resetting any admin)
    const { data: admins, error: adminError } = await supabase
      .from("admin_users")
      .select("id, username")
      .limit(1);

    if (adminError || !admins || admins.length === 0) {
      console.error("No admin users found:", adminError);
      return new Response(
        JSON.stringify({ error: "Nessun admin trovato" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const admin = admins[0];

    // Delete any existing unused tokens for this admin
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("admin_user_id", admin.id)
      .is("used_at", null);

    // Create new reset token
    const { error: insertError } = await supabase
      .from("password_reset_tokens")
      .insert({
        admin_user_id: admin.id,
        token: token,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      });

    if (insertError) {
      console.error("Error creating token:", insertError);
      return new Response(
        JSON.stringify({ error: "Errore nella creazione del token" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the app URL from origin header or use default
    const origin = req.headers.get("origin") || "https://nonceduo.com";
    const resetUrl = `${origin}/admin/reset?token=${token}`;

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: "Non C'è Duo <onboarding@resend.dev>",
      to: ["nonceduo.music@gmail.com"],
      subject: "Reset Credenziali Admin - Non C'è Duo Karaoke",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #1a1a2e; color: #fff; padding: 40px; }
            .container { max-width: 500px; margin: 0 auto; background: #16213e; padding: 30px; border-radius: 12px; border: 2px solid #00d4ff; }
            h1 { color: #00d4ff; margin-bottom: 20px; }
            p { line-height: 1.6; color: #ccc; }
            .button { display: inline-block; background: linear-gradient(135deg, #ff006e, #00d4ff); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .warning { background: #2a1a1a; padding: 15px; border-radius: 8px; border-left: 4px solid #ff006e; margin-top: 20px; }
            .footer { margin-top: 30px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎤 Reset Credenziali Admin</h1>
            <p>Hai richiesto il reset delle credenziali per il pannello admin di <strong>Non C'è Duo Karaoke</strong>.</p>
            <p>Clicca il pulsante qui sotto per impostare nuove credenziali:</p>
            <a href="${resetUrl}" class="button">Reset Credenziali</a>
            <div class="warning">
              <strong>⚠️ Attenzione:</strong> Questo link scadrà tra 1 ora. Se non hai richiesto tu il reset, ignora questa email.
            </div>
            <div class="footer">
              <p>Non C'è Duo - Karaoke Management System</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      return new Response(
        JSON.stringify({ error: "Errore nell'invio dell'email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Password reset email sent successfully");
    return new Response(
      JSON.stringify({ success: true, message: "Email di reset inviata" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in request-password-reset:", error);
    return new Response(
      JSON.stringify({ error: "Errore interno del server" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
