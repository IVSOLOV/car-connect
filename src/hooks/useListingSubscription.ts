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
    try {
      const { data, error: funcError } = await supabase.functions.invoke("create-listing-checkout", {
        body: { quantity },
      });

      if (funcError) throw funcError;

      if (data?.url) {
        // Redirect in same tab to prevent duplicate submissions
        // Use window.open with _self for better iframe compatibility
        const stripeUrl = data.url;
        console.log("[startCheckout] Redirecting to Stripe:", stripeUrl);
        
        // Try multiple redirect methods for maximum compatibility
        try {
          window.location.assign(stripeUrl);
        } catch {
          window.location.href = stripeUrl;
        }
        
        // Return a promise that never resolves to prevent further code execution
        return new Promise(() => {});
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Error starting checkout:", err);
      throw err;
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
