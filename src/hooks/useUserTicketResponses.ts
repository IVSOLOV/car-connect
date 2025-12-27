import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserTicketResponses = () => {
  const { user } = useAuth();
  const [responseCount, setResponseCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setResponseCount(0);
      return;
    }

    const fetchResponseCount = async () => {
      // Count tickets that have admin_notes (meaning support responded) and user hasn't seen them
      const { count, error } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .not("admin_notes", "is", null)
        .neq("admin_notes", "")
        .in("status", ["in_progress", "resolved"]);

      if (!error && count !== null) {
        setResponseCount(count);
      }
    };

    fetchResponseCount();

    // Set up realtime subscription
    const channel = supabase
      .channel("user-ticket-responses")
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
  }, [user]);

  return { responseCount };
};
