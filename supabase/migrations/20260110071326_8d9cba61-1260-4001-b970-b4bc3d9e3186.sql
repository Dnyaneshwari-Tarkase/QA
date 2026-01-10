-- Create a public function to validate teacher secret code without exposing profile data
-- This function is SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.validate_teacher_secret_code(code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.secret_code = code
      AND ur.role = 'teacher'
  )
$$;