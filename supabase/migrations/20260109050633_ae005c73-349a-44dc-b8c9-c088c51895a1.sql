-- Add exam_duration column to question_papers for timer feature
ALTER TABLE public.question_papers ADD COLUMN IF NOT EXISTS exam_duration INTEGER DEFAULT 60;

-- Add show_correct_answers column for teacher control over showing answers
ALTER TABLE public.question_papers ADD COLUMN IF NOT EXISTS show_correct_answers BOOLEAN DEFAULT false;

-- Create exam_attempts table to track student exam attempts
CREATE TABLE IF NOT EXISTS public.exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES public.question_papers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  is_submitted BOOLEAN NOT NULL DEFAULT false,
  time_remaining INTEGER,
  answers JSONB DEFAULT '[]'::jsonb,
  score INTEGER,
  correct_count INTEGER,
  wrong_count INTEGER,
  total_questions INTEGER,
  tab_switch_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(paper_id, student_id)
);

-- Enable RLS on exam_attempts
ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts
CREATE POLICY "Students can view their own attempts"
ON public.exam_attempts
FOR SELECT
USING (auth.uid() = student_id);

-- Students can insert their own attempts
CREATE POLICY "Students can insert their own attempts"
ON public.exam_attempts
FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Students can update their own attempts (for saving answers)
CREATE POLICY "Students can update their own attempts"
ON public.exam_attempts
FOR UPDATE
USING (auth.uid() = student_id);

-- Teachers can view attempts for their papers using security definer function
CREATE OR REPLACE FUNCTION public.is_paper_owner(_paper_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.question_papers
    WHERE id = _paper_id
      AND teacher_id = _user_id
  )
$$;

-- Teachers can view attempts for their papers
CREATE POLICY "Teachers can view attempts for their papers"
ON public.exam_attempts
FOR SELECT
USING (public.is_paper_owner(paper_id, auth.uid()));