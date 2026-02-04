-- =============================================
-- ASSISTENTE VIRTUALE - Schema Database
-- =============================================

-- Tabella impostazioni assistente
CREATE TABLE public.assistant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean NOT NULL DEFAULT false,
  -- Toggle per sezioni
  enabled_on_site boolean NOT NULL DEFAULT true,
  enabled_on_openmic boolean NOT NULL DEFAULT true,
  enabled_on_dediche boolean NOT NULL DEFAULT true,
  enabled_on_community boolean NOT NULL DEFAULT true,
  -- Configurazione widget
  proactive_delay_seconds integer NOT NULL DEFAULT 5,
  welcome_message text NOT NULL DEFAULT 'Ciao! Come posso aiutarti? 🎶',
  -- Metadata
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Tabella conversazioni assistente
CREATE TABLE public.assistant_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identificazione utente (anonimo o registrato)
  session_id text,
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  user_email text,
  -- Contesto
  source_section text NOT NULL DEFAULT 'site', -- site, openmic, dediche, community
  source_url text,
  -- Stato
  status text NOT NULL DEFAULT 'active', -- active, resolved, archived
  flow_path text[], -- percorso seguito nei flussi guidati
  -- Lead qualification
  lead_type text, -- locale, matrimonio, privato, pubblico, curioso
  lead_score integer DEFAULT 0,
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  resolved_by uuid REFERENCES auth.users(id)
);

-- Tabella messaggi assistente
CREATE TABLE public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.assistant_conversations(id) ON DELETE CASCADE,
  -- Sender
  sender_type text NOT NULL, -- 'user', 'bot', 'admin'
  sender_name text,
  sender_user_id uuid REFERENCES auth.users(id),
  -- Contenuto
  message_text text NOT NULL,
  message_type text NOT NULL DEFAULT 'text', -- 'text', 'flow_choice', 'cta'
  metadata jsonb DEFAULT '{}',
  -- Stato
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  -- Timestamps
  created_at timestamp with time zone DEFAULT now()
);

-- Indici per performance
CREATE INDEX idx_assistant_conversations_status ON public.assistant_conversations(status);
CREATE INDEX idx_assistant_conversations_session ON public.assistant_conversations(session_id);
CREATE INDEX idx_assistant_conversations_source ON public.assistant_conversations(source_section);
CREATE INDEX idx_assistant_messages_conversation ON public.assistant_messages(conversation_id);
CREATE INDEX idx_assistant_messages_created ON public.assistant_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.assistant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- SETTINGS: Solo staff può vedere e modificare
CREATE POLICY "Staff can view assistant settings"
  ON public.assistant_settings FOR SELECT
  USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Owners and Admins can manage assistant settings"
  ON public.assistant_settings FOR ALL
  USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Policy pubblica per leggere solo is_enabled e le sezioni abilitate
CREATE POLICY "Anyone can check if assistant is enabled"
  ON public.assistant_settings FOR SELECT
  USING (true);

-- CONVERSATIONS: Chiunque può creare, staff può vedere tutte
CREATE POLICY "Anyone can create conversations"
  ON public.assistant_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own conversations"
  ON public.assistant_conversations FOR SELECT
  USING (
    session_id = (current_setting('request.headers', true)::json->>'x-session-id')
    OR user_id = auth.uid()
    OR is_owner(auth.uid()) 
    OR has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'moderator'::app_role)
  );

CREATE POLICY "Staff can manage all conversations"
  ON public.assistant_conversations FOR ALL
  USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- MESSAGES: Chiunque può inviare, staff può vedere tutti
CREATE POLICY "Anyone can send messages"
  ON public.assistant_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view messages in own conversations"
  ON public.assistant_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.assistant_conversations ac
      WHERE ac.id = assistant_messages.conversation_id
      AND (
        ac.session_id = (current_setting('request.headers', true)::json->>'x-session-id')
        OR ac.user_id = auth.uid()
        OR is_owner(auth.uid())
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'moderator'::app_role)
      )
    )
  );

CREATE POLICY "Staff can manage all messages"
  ON public.assistant_messages FOR ALL
  USING (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (is_owner(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- =============================================
-- Trigger per updated_at
-- =============================================

CREATE TRIGGER update_assistant_settings_updated_at
  BEFORE UPDATE ON public.assistant_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assistant_conversations_updated_at
  BEFORE UPDATE ON public.assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Enable Realtime
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.assistant_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assistant_messages;

-- =============================================
-- Insert default settings
-- =============================================

INSERT INTO public.assistant_settings (
  is_enabled,
  enabled_on_site,
  enabled_on_openmic,
  enabled_on_dediche,
  enabled_on_community,
  welcome_message
) VALUES (
  false,
  true,
  true,
  true,
  true,
  'Ciao! Posso aiutarti a capire se Non c''è Duo è quello che stai cercando 🎶'
);