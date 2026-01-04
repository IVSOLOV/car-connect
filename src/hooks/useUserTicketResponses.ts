import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserTicketResponses = () => {
  const { user } = useAuth();
  const [responseCount, setResponseCount] = useState(0);

  const fetchResponseCount = useCallback(async () => {
    if (!user) {
      setResponseCount(0);
      return;
    }

    // Count tickets that have unread admin responses
    // We check response_read_at is null - admin sets this to null when they respond
    const { count, error } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("response_read_at", null)
      .neq("status", "open"); // If status changed from open, admin has responded

    if (!error && count !== null) {
      setResponseCount(count);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setResponseCount(0);
      return;
    }

    fetchResponseCount();

    // Set up realtime subscription
    const channel = supabase
      .channel(`user-ticket-responses-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchResponseCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchResponseCount]);

  return { responseCount, refetch: fetchResponseCount };
};
