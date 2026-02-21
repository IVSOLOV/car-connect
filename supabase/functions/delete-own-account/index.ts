import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client with the user's token to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Use service role client for deletion operations
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Delete user data in order (respecting foreign keys)
    // 1. Messages
    await adminClient.from("messages").delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`);
    
    // 2. Saved listings
    await adminClient.from("saved_listings").delete().eq("user_id", userId);
    
    // 3. Reviews
    await adminClient.from("user_reviews").delete().or(`reviewer_id.eq.${userId},reviewed_id.eq.${userId}`);
    
    // 4. Support ticket comments
    const { data: tickets } = await adminClient.from("support_tickets").select("id").eq("user_id", userId);
    if (tickets && tickets.length > 0) {
      const ticketIds = tickets.map(t => t.id);
      await adminClient.from("support_ticket_comments").delete().in("ticket_id", ticketIds);
      await adminClient.from("support_ticket_admin_notes").delete().in("ticket_id", ticketIds);
    }
    await adminClient.from("support_tickets").delete().eq("user_id", userId);
    
    // 5. Listing-related data
    const { data: listings } = await adminClient.from("listings").select("id").eq("user_id", userId);
    if (listings && listings.length > 0) {
      const listingIds = listings.map(l => l.id);
      await adminClient.from("listing_bookings").delete().in("listing_id", listingIds);
      await adminClient.from("listing_sensitive_data").delete().in("listing_id", listingIds);
      // Also remove saved listings by others for these listings
      await adminClient.from("saved_listings").delete().in("listing_id", listingIds);
    }
    await adminClient.from("listings").delete().eq("user_id", userId);
    
    // 6. Push tokens
    await adminClient.from("push_tokens").delete().eq("user_id", userId);
    
    // 7. Profiles
    await adminClient.from("private_profiles").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("user_id", userId);
    
    // 8. User roles
    await adminClient.from("user_roles").delete().eq("user_id", userId);

    // 9. Delete the auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Error deleting auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
