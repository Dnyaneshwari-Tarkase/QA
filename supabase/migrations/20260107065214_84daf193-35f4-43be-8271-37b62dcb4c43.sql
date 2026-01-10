-- Remove the overly permissive policy that exposes exam content publicly
DROP POLICY IF EXISTS "Anyone can view papers by paper_id" ON public.question_papers;

-- The existing "Teachers can view their own papers" policy already covers:
-- - Teachers viewing their own papers
-- - Students (authenticated) viewing papers
-- This is sufficient for legitimate access