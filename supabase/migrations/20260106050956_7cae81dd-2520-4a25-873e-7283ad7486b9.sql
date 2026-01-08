-- Add secret_code column to profiles table for teachers
ALTER TABLE public.profiles ADD COLUMN secret_code text;

-- Create index for secret_code lookups
CREATE INDEX idx_profiles_secret_code ON public.profiles(secret_code);

-- Add teacher_secret_code to students' profiles (to link them to a teacher)
-- This will be the secret code they enter during signup/login

-- Update question_papers to include the teacher's secret_code for easier querying
ALTER TABLE public.question_papers ADD COLUMN teacher_secret_code text;

-- Create index for teacher_secret_code on question_papers
CREATE INDEX idx_question_papers_teacher_secret_code ON public.question_papers(teacher_secret_code);

-- Update RLS policy for students to view papers by teacher_secret_code
DROP POLICY IF EXISTS "Anyone can view papers by paper_id" ON public.question_papers;

-- Teachers can view their own papers
DROP POLICY IF EXISTS "Teachers can view their own papers" ON public.question_papers;

CREATE POLICY "Teachers can view their own papers" 
ON public.question_papers 
FOR SELECT 
USING (
  (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'::app_role))
  OR
  (has_role(auth.uid(), 'student'::app_role))
);

-- Public access for viewing papers by paper_id (for sharing links)
CREATE POLICY "Anyone can view papers by paper_id" 
ON public.question_papers 
FOR SELECT 
USING (true);