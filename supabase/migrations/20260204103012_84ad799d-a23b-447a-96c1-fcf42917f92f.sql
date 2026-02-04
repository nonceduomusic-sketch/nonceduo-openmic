-- Keep assistant_conversations.updated_at in sync when any message is inserted

CREATE OR REPLACE FUNCTION public.assistant_touch_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.assistant_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assistant_messages_touch_conversation ON public.assistant_messages;

CREATE TRIGGER assistant_messages_touch_conversation
AFTER INSERT ON public.assistant_messages
FOR EACH ROW
EXECUTE FUNCTION public.assistant_touch_conversation_updated_at();
