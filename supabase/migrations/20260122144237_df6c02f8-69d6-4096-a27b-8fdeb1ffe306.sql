DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  EXCEPTION
    WHEN duplicate_object THEN
      -- already in publication
      NULL;
  END;
END $$;