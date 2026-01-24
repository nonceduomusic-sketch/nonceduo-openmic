import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...data } = await req.json();
    console.log(`[push-notifications] Action: ${action}`);

    switch (action) {
      case 'get-vapid-key': {
        // Return public VAPID key for client subscription
        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
        if (!vapidPublicKey) {
          return new Response(
            JSON.stringify({ error: 'VAPID key not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ publicKey: vapidPublicKey }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'subscribe': {
        // Save push subscription
        const { subscription, userType, userIdentifier, deviceInfo } = data;
        
        if (!subscription || !subscription.endpoint) {
          return new Response(
            JSON.stringify({ error: 'Invalid subscription' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            endpoint: subscription.endpoint,
            p256dh: subscription.keys?.p256dh || '',
            auth: subscription.keys?.auth || '',
            user_type: userType || 'admin',
            user_identifier: userIdentifier,
            device_info: deviceInfo,
            last_used_at: new Date().toISOString(),
          }, { onConflict: 'endpoint' });

        if (error) {
          console.error('Error saving subscription:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to save subscription' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('Push subscription saved successfully');
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'unsubscribe': {
        // Remove push subscription
        const { endpoint } = data;
        
        if (!endpoint) {
          return new Response(
            JSON.stringify({ error: 'Endpoint required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', endpoint);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'send': {
        // Send notification to all admin subscriptions
        // Note: This is a simplified version - real Web Push requires encryption
        // For now, we store subscriptions and can trigger notifications from client
        const { title, body } = data;
        
        const { data: subscriptions, error } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_type', 'admin');

        if (error) {
          console.error('Error fetching subscriptions:', error);
          return new Response(
            JSON.stringify({ error: 'Failed to fetch subscriptions' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Found ${subscriptions?.length || 0} admin subscriptions`);
        
        // Return subscription count - actual push happens via browser
        return new Response(
          JSON.stringify({ 
            success: true, 
            subscriptionCount: subscriptions?.length || 0,
            message: `${subscriptions?.length || 0} dispositivi registrati` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'test': {
        // For testing - verify subscription exists
        const { endpoint } = data;
        
        let query = supabase.from('push_subscriptions').select('*').eq('user_type', 'admin');
        
        if (endpoint) {
          query = supabase.from('push_subscriptions').select('*').eq('endpoint', endpoint);
        }
        
        const { data: subscriptions } = await query.limit(1);

        return new Response(
          JSON.stringify({ 
            success: true, 
            hasSubscription: (subscriptions?.length || 0) > 0 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('Error in push-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
