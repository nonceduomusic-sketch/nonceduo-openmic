import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomPassword(length = 18) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function slugifyUsername(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";

    // User client (to resolve who is calling)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client (service role for seeding)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Allow only owner/admin to run this
    const callerId = userData.user.id;
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .in("role", ["owner", "admin"])
      .maybeSingle();

    if (roleErr || !roleRow?.role) {
      return new Response(JSON.stringify({ error: "Permessi insufficienti" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if demo already exists, skip
    const { data: existingDemo, error: demoCheckErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("bio", "%profilo demo%")
      .limit(1);

    if (demoCheckErr) {
      console.error("Demo check failed:", demoCheckErr);
    }

    if ((existingDemo ?? []).length > 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          skipped: true,
          message: "Demo già presenti: nessuna modifica effettuata.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const names = [
      "Marco R.",
      "Giulia P.",
      "Luca B.",
      "Sara V.",
      "Andrea M.",
      "Chiara F.",
      "Davide S.",
      "Martina L.",
      "Federico G.",
      "Elena C.",
      "Simone T.",
      "Francesca D.",
      "Matteo N.",
      "Alessia K.",
      "Gabriele A.",
      "Valentina Z.",
      "Pietro H.",
      "Irene Q.",
      "Nicola O.",
      "Beatrice I.",
      "Stefano W.",
      "Laura E.",
      "Riccardo J.",
      "Miriam U.",
      "Tommaso X.",
      "Noemi Y.",
      "Emanuele R.",
      "Aurora P.",
      "Dario B.",
      "Camilla V.",
    ];

    const bios = [
      "Cantante da doccia • profilo demo",
      "Open Mic addicted • profilo demo",
      "Chitarra e karaoke • profilo demo",
      "Mi piacciono i duetti • profilo demo",
      "Rock anni 80 • profilo demo",
      "Pop italiano • profilo demo",
      "Soul e R&B • profilo demo",
      "Indie lover • profilo demo",
      "Classici intramontabili • profilo demo",
      "Serate karaoke >>> • profilo demo",
    ];

    const postTexts = [
      "Chi viene all'Open Mic questa settimana?",
      "Sto preparando un duetto… consigli?",
      "Qual è la canzone che vi fa cantare a squarciagola?",
      "Stasera prova microfono: chi si unisce?",
      "Team Vasco o Team Ligabue?",
      "Mi serve un consiglio: tonalità per “Hallelujah”?",
      "Nuova qui! Che vibe c'è in community?",
      "Serata pazzesca ieri, grazie a tutti!",
      "Qualcuno per un duetto di Elisa?",
      "Ho appena scoperto un live stupendo, consigli simili?",
    ];

    const groupNames = ["Duetti del Venerdì", "Rock & Classici", "Pop Italiano", "Consigli Vocali"];
    const groupMsgs = [
      "Chi propone un duetto per venerdì?",
      "Io ci sto! Che brano scegliamo?",
      "Ragazzi, ieri ho spaccato con Queen!",
      "Consigli per scaldare la voce prima di salire?",
      "Stasera faccio “Sally”, qualcuno la canta?",
      "Che tonalità usate per “Creep”?",
      "Facciamo una lista dei pezzi più facili per iniziare.",
      "Mi è rimasta in testa “La cura”… wow.",
      "Qualcuno ha voglia di un mashup?",
      "Dai che ci vediamo al prossimo Open Mic!",
    ];

    console.log("Seeding demo community…");

    // 1) Create demo auth users + profiles
    const demoUserIds: string[] = [];
    for (let i = 0; i < names.length; i++) {
      const displayName = names[i];
      const base = slugifyUsername(displayName);
      const email = `demo.${i + 1}.${base}@demo.nonceduo.local`;

      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: {
          demo: true,
          username: base,
          display_name: displayName,
        },
      });

      if (createErr || !created.user) {
        console.error("Failed to create demo user", email, createErr);
        continue;
      }

      const userId = created.user.id;
      demoUserIds.push(userId);

      const username = `${base}_${userId.substring(0, 4)}`;
      const bio = bios[i % bios.length];
      const isOnline = i % 4 === 0;

      const createdAt = new Date(Date.now() - (35 - (i % 30)) * 24 * 60 * 60 * 1000).toISOString();
      const lastSeenAt = new Date(Date.now() - (i % 48) * 60 * 60 * 1000).toISOString();

      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            user_id: userId,
            display_name: displayName,
            username,
            bio,
            is_online: isOnline,
            last_seen_at: lastSeenAt,
            created_at: createdAt,
            updated_at: createdAt,
          },
          { onConflict: "user_id" },
        );

      if (profileErr) {
        console.error("Failed to upsert demo profile", userId, profileErr);
      }
    }

    // 2) Posts (90) over the last ~30 days
    const posts: Array<{ user_id: string; content: string; created_at: string; updated_at: string; likes_count: number; comments_count: number }> = [];
    for (let p = 1; p <= 90; p++) {
      const userId = demoUserIds[(p - 1) % demoUserIds.length];
      const content = postTexts[(p - 1) % postTexts.length];
      const createdAt = new Date(Date.now() - (p % 30) * 24 * 60 * 60 * 1000 - (p % 12) * 60 * 60 * 1000).toISOString();
      posts.push({
        user_id: userId,
        content,
        created_at: createdAt,
        updated_at: createdAt,
        likes_count: 0,
        comments_count: 0,
      });
    }

    // Insert in chunks
    for (let i = 0; i < posts.length; i += 50) {
      const chunk = posts.slice(i, i + 50);
      const { error } = await supabaseAdmin.from("posts").insert(chunk);
      if (error) console.error("Posts insert chunk failed:", error);
    }

    // 3) Create public groups
    const groups: string[] = [];
    for (let gi = 0; gi < groupNames.length; gi++) {
      const createdAt = new Date(Date.now() - (25 - gi * 3) * 24 * 60 * 60 * 1000).toISOString();
      const updatedAt = new Date(Date.now() - (1 + gi) * 24 * 60 * 60 * 1000).toISOString();

      const { data: conv, error: convErr } = await supabaseAdmin
        .from("conversations")
        .insert({
          name: groupNames[gi],
          section: "community",
          is_group: true,
          is_public: true,
          created_at: createdAt,
          updated_at: updatedAt,
        })
        .select("id")
        .single();

      if (convErr || !conv?.id) {
        console.error("Failed to create group", groupNames[gi], convErr);
        continue;
      }
      groups.push(conv.id);
    }

    // 4) Add participants (20 total)
    const participants: Array<{ conversation_id: string; session_id: string; participant_name: string; user_id: string; joined_at: string }> = [];
    for (let i = 0; i < Math.min(20, demoUserIds.length); i++) {
      const conversationId = groups[Math.floor(i / 5) % groups.length];
      const joinedAt = new Date(Date.now() - (i % 20) * 24 * 60 * 60 * 1000).toISOString();
      participants.push({
        conversation_id: conversationId,
        session_id: demoUserIds[i],
        participant_name: names[i],
        user_id: demoUserIds[i],
        joined_at: joinedAt,
      });
    }
    if (participants.length) {
      const { error } = await supabaseAdmin.from("conversation_participants").insert(participants);
      if (error) console.error("Participants insert failed:", error);
    }

    // 5) Messages (40 total)
    const messages: Array<{ conversation_id: string; sender_type: string; sender_name: string; sender_user_id: string; sender_session_id: string | null; message_text: string; status: string; created_at: string }> = [];
    for (let m = 1; m <= 40; m++) {
      const conversationId = groups[Math.floor((m - 1) / 10) % groups.length];
      const idx = (m - 1) % demoUserIds.length;
      const createdAt = new Date(Date.now() - (m % 14) * 24 * 60 * 60 * 1000 - (m % 10) * 60 * 60 * 1000).toISOString();
      messages.push({
        conversation_id: conversationId,
        sender_type: "user",
        sender_name: names[idx],
        sender_user_id: demoUserIds[idx],
        sender_session_id: null,
        message_text: groupMsgs[(m - 1) % groupMsgs.length],
        status: "sent",
        created_at: createdAt,
      });
    }
    if (messages.length) {
      for (let i = 0; i < messages.length; i += 50) {
        const chunk = messages.slice(i, i + 50);
        const { error } = await supabaseAdmin.from("chat_messages").insert(chunk);
        if (error) console.error("Chat messages insert chunk failed:", error);
      }
    }

    console.log("Demo seed completed:", {
      profiles: demoUserIds.length,
      posts: posts.length,
      groups: groups.length,
      messages: messages.length,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        skipped: false,
        counts: {
          profiles: demoUserIds.length,
          posts: posts.length,
          groups: groups.length,
          groupMessages: messages.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("seed-community-demo unexpected error:", error);
    return new Response(JSON.stringify({ error: "Errore interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
