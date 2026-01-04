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
    // Only count tickets that:
    // 1. Belong to the current user
    // 2. Have response_read_at as null (not yet read by user)
    // 3. Actually have admin notes (not just status changed)
    const { data: ticketsWithNotes, error } = await supabase
      .from("support_tickets")
      .select(`
        id,
        response_read_at,
        support_ticket_admin_notes!inner(notes)
      `)
      .eq("user_id", user.id)
      .is("response_read_at", null);

    if (!error && ticketsWithNotes) {
      // Count tickets that have non-empty admin notes
      const count = ticketsWithNotes.filter(
        (t) => t.support_ticket_admin_notes?.notes
      ).length;
      setResponseCount(count);
    } else {
      setResponseCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setResponseCount(0);
      return;
    }

    fetchResponseCount();

    // Set up realtime subscription for both tables
    const ticketChannel = supabase
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_ticket_admin_notes",
        },
        () => {
          fetchResponseCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
    };
  }, [user, fetchResponseCount]);

  return { responseCount, refetch: fetchResponseCount };
};
