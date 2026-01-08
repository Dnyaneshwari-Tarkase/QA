-- Add paper_type and exam_link columns to question_papers table
ALTER TABLE public.question_papers 
ADD COLUMN paper_type text NOT NULL DEFAULT 'printable',
ADD COLUMN exam_link text;

-- Add constraint to ensure paper_type is valid
ALTER TABLE public.question_papers
ADD CONSTRAINT question_papers_paper_type_check 
CHECK (paper_type IN ('printable', 'online'));