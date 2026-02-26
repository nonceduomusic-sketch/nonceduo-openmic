
CREATE OR REPLACE FUNCTION public.furore_update_session(p_session_id uuid, p_updates jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.furore_sessions
  SET 
    status = COALESCE((p_updates->>'status'), status),
    max_players = COALESCE((p_updates->>'max_players')::integer, max_players),
    show_order_to_players = COALESCE((p_updates->>'show_order_to_players')::boolean, show_order_to_players),
    show_player_count = COALESCE((p_updates->>'show_player_count')::boolean, show_player_count),
    show_bookings_to_players = COALESCE((p_updates->>'show_bookings_to_players')::boolean, show_bookings_to_players),
    show_leaderboard = COALESCE((p_updates->>'show_leaderboard')::boolean, show_leaderboard),
    sound_key = COALESCE((p_updates->>'sound_key'), sound_key),
    scoring_rules = COALESCE((p_updates->'scoring_rules'), scoring_rules),
    auto_scoring = COALESCE((p_updates->>'auto_scoring')::boolean, auto_scoring),
    updated_at = now()
  WHERE id = p_session_id;
  
  RETURN FOUND;
END;
$function$;
