import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  redirectTo: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("social-password-reset function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo }: PasswordResetRequest = await req.json();
    
    console.log(`Password reset requested for: ${email}`);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Send password reset email using Supabase Auth
    const { data, error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${Deno.env.get("SUPABASE_URL")}/auth/v1/callback`,
    });

    if (error) {
      console.error("Error sending password reset:", error);
      // Don't reveal if email exists or not for security
      return new Response(
        JSON.stringify({ success: true, message: "Se l'email è registrata, riceverai un link per reimpostare la password." }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Password reset email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Se l'email è registrata, riceverai un link per reimpostare la password." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in social-password-reset function:", error);
    return new Response(
      JSON.stringify({ error: "Si è verificato un errore. Riprova." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
