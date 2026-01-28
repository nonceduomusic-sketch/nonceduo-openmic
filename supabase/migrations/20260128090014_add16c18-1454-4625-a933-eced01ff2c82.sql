-- Imposta il nome evento di default a "EVENTO LIVE" per evitare che, dopo reset/ricreazione record, torni a valori legacy.

ALTER TABLE public.free_mode_settings
  ALTER COLUMN event_name SET DEFAULT 'EVENTO LIVE';

ALTER TABLE public.event_booking_rules
  ALTER COLUMN event_name SET DEFAULT 'EVENTO LIVE';
