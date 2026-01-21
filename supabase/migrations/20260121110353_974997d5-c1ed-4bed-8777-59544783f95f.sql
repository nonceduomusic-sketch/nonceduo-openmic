-- Fix normalize_song_text function with fixed search_path
CREATE OR REPLACE FUNCTION public.normalize_song_text(t text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
  SELECT lower(btrim(regexp_replace(coalesce(t, ''), '[''''`´]', '''', 'g')))
$function$;