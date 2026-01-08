-- Update handle_new_user function to save secret_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_role app_role;
  user_secret_code text;
BEGIN
  -- Get role from metadata or default to student
  user_role := COALESCE(
    (new.raw_user_meta_data ->> 'role')::app_role,
    'student'
  );
  
  -- Get secret code from metadata
  user_secret_code := new.raw_user_meta_data ->> 'secret_code';
  
  -- Create profile with secret code
  INSERT INTO public.profiles (id, email, full_name, secret_code)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    user_secret_code
  );
  
  -- Assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, user_role);
  
  RETURN new;
END;
$function$;