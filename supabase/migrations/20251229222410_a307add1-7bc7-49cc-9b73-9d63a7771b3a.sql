-- Create a private_profiles table for sensitive user data that only the user can access
CREATE TABLE public.private_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.private_profiles ENABLE ROW LEVEL SECURITY;

-- Only allow users to view/update their own private profile
CREATE POLICY "Users can view their own private profile"
ON public.private_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own private profile"
ON public.private_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own private profile"
ON public.private_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Migrate existing phone data to private_profiles
INSERT INTO public.private_profiles (user_id, phone)
SELECT user_id, phone FROM public.profiles WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET phone = EXCLUDED.phone;

-- Remove phone column from profiles table (no longer needed publicly)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

-- Update handle_new_user function to create private profile for phone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create public profile
  INSERT INTO public.profiles (user_id, first_name, last_name, full_name, company_name, show_company_as_owner, avatar_url)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name'),
    NEW.raw_user_meta_data ->> 'company_name',
    COALESCE((NEW.raw_user_meta_data ->> 'show_company_as_owner')::boolean, false),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  -- Create private profile with phone
  INSERT INTO public.private_profiles (user_id, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'phone'
  );
  
  -- Assign default guest role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'guest');
  
  RETURN NEW;
END;
$$;

-- Add trigger for updating timestamps on private_profiles
CREATE TRIGGER update_private_profiles_updated_at
BEFORE UPDATE ON public.private_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();