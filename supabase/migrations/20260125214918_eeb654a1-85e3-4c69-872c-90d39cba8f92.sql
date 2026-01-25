-- Add unique constraint to prevent duplicate votes per user per reservation
ALTER TABLE public.performance_votes 
ADD CONSTRAINT performance_votes_unique_user_reservation 
UNIQUE (reservation_id, voter_fingerprint);

-- Allow users to update their own votes
CREATE POLICY "Users can update own votes"
ON public.performance_votes
FOR UPDATE
USING (voter_fingerprint = voter_fingerprint)
WITH CHECK (true);

-- Create trigger function to handle vote updates (changing vote type)
CREATE OR REPLACE FUNCTION public.update_vote_counts_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- For UPDATE: subtract old vote, add new vote
  IF TG_OP = 'UPDATE' THEN
    UPDATE public.performance_vote_counts 
    SET
      -- Don't change total_votes since it's still one vote
      fire_votes = fire_votes 
        - CASE WHEN OLD.vote_type = 'fire' THEN 1 ELSE 0 END
        + CASE WHEN NEW.vote_type = 'fire' THEN 1 ELSE 0 END,
      heart_votes = heart_votes 
        - CASE WHEN OLD.vote_type = 'heart' THEN 1 ELSE 0 END
        + CASE WHEN NEW.vote_type = 'heart' THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE reservation_id = NEW.reservation_id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Create trigger for UPDATE operations
CREATE TRIGGER on_vote_update
AFTER UPDATE ON public.performance_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_vote_counts_on_change();