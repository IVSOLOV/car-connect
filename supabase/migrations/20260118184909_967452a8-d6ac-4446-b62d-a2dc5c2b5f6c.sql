-- Create table to track deactivated users/emails
CREATE TABLE public.deactivated_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID,
  deactivated_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deactivated_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view deactivated users
CREATE POLICY "Admins can view deactivated users"
ON public.deactivated_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert deactivated users
CREATE POLICY "Admins can insert deactivated users"
ON public.deactivated_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete (reactivate) deactivated users
CREATE POLICY "Admins can delete deactivated users"
ON public.deactivated_users
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));