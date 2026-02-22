import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionStatus {
  hasSubscription: boolean;
  paidListingSlots: number;
  activeListings: number;
  availableSlots: number;
}

export function useListingSubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: funcError } = await supabase.functions.invoke("check-listing-subscription");

      if (funcError) throw funcError;

      setStatus(data);
    } catch (err) {
      console.error("Error checking subscription:", err);
      setError(err instanceof Error ? err.message : "Failed to check subscription");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const startCheckout = async (quantity: number = 1) => {
    const { data, error: funcError } = await supabase.functions.invoke("create-listing-checkout", {
      body: { quantity },
    });

    if (funcError) throw funcError;

    if (data?.updated) {
      // Existing subscription was updated (quantity incremented)
      console.log("[startCheckout] Subscription updated, new quantity:", data.newQuantity);
      return { updated: true, newQuantity: data.newQuantity };
    } else if (data?.url) {
      // New checkout session for first-time subscriber
      const stripeUrl = data.url;
      console.log("[startCheckout] Got Stripe URL:", stripeUrl);
      return { url: stripeUrl };
    } else {
      throw new Error("No checkout URL returned");
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error: funcError } = await supabase.functions.invoke("customer-portal");

      if (funcError) throw funcError;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Error opening customer portal:", err);
      throw err;
    }
  };

  return {
    status,
    isLoading,
    error,
    checkSubscription,
    startCheckout,
    openCustomerPortal,
    canCreateListing: status?.availableSlots !== undefined && status.availableSlots > 0,
  };
}
