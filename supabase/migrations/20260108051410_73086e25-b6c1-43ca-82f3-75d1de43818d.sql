-- Allow public access to view papers by paper_id (for online exams like Google Forms)
CREATE POLICY "Anyone can view papers by paper_id" 
ON public.question_papers 
FOR SELECT 
USING (true);