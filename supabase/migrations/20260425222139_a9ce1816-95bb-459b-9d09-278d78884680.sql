CREATE TABLE public.listing_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_checkout_session_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL,
  trial_end TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_listing_subscriptions_user_id ON public.listing_subscriptions(user_id);
CREATE INDEX idx_listing_subscriptions_customer_id ON public.listing_subscriptions(stripe_customer_id);

ALTER TABLE public.listing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
ON public.listing_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.listing_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_listing_subscriptions_updated_at
BEFORE UPDATE ON public.listing_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();