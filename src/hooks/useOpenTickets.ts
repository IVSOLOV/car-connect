import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useOpenTickets = () => {
  const { user, role } = useAuth();
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    if (!user || role !== "admin") {
      setOpenCount(0);
      return;
    }

    const fetchOpenTickets = async () => {
      const { count, error } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      if (!error && count !== null) {
        setOpenCount(count);
      }
    };

    fetchOpenTickets();

    // Subscribe to changes
    const channel = supabase
      .channel("support_tickets_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
        },
        () => {
          fetchOpenTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  return { openCount };
};
