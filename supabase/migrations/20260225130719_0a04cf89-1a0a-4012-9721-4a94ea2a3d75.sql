ALTER TABLE public.furore_sessions 
ADD COLUMN scoring_rules jsonb NOT NULL DEFAULT '{"1": 10, "2": 7, "3": 5, "4": 3, "5": 1}'::jsonb;