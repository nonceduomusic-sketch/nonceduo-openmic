
-- 1) Add 'decade' column to quiz_questions
ALTER TABLE public.quiz_questions 
ADD COLUMN IF NOT EXISTS decade TEXT DEFAULT NULL;

-- 2) Create junction table for multi-list assignment
CREATE TABLE IF NOT EXISTS public.quiz_question_set_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  question_set_id UUID NOT NULL REFERENCES public.quiz_question_sets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, question_set_id)
);

-- 3) Enable RLS (open access like other quiz tables)
ALTER TABLE public.quiz_question_set_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to quiz_question_set_members"
  ON public.quiz_question_set_members
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4) Migrate existing question_set_id data into the junction table
INSERT INTO public.quiz_question_set_members (question_id, question_set_id)
SELECT id, question_set_id 
FROM public.quiz_questions 
WHERE question_set_id IS NOT NULL
ON CONFLICT (question_id, question_set_id) DO NOTHING;

-- 5) Add realtime for junction table
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_question_set_members;
