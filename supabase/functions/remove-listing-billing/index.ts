import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LISTING_FEE_PRICE_ID = "price_1So5wvQrhDI6nmwAxz1ER86o";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    console.log("[REMOVE-LISTING-BILLING] Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("[REMOVE-LISTING-BILLING] User authenticated", { userId: user.id, email: user.email });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find the customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      console.log("[REMOVE-LISTING-BILLING] No Stripe customer found, nothing to update");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;

    // Find active or trialing subscription with the listing fee price
    const statuses = ["active", "trialing"];
    let targetItem = null;

    for (const status of statuses) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: status as any,
        limit: 10,
      });

      for (const sub of subscriptions.data) {
        for (const item of sub.items.data) {
          if (item.price.id === LISTING_FEE_PRICE_ID) {
            targetItem = { subscriptionId: sub.id, itemId: item.id, quantity: item.quantity || 0 };
            break;
          }
        }
        if (targetItem) break;
      }
      if (targetItem) break;
    }

    if (!targetItem) {
      console.log("[REMOVE-LISTING-BILLING] No matching subscription found");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { quantity = 1 } = await req.json().catch(() => ({}));
    const newQuantity = Math.max(0, targetItem.quantity - quantity);

    console.log("[REMOVE-LISTING-BILLING] Updating subscription", {
      currentQuantity: targetItem.quantity,
      removing: quantity,
      newQuantity,
    });

    if (newQuantity === 0) {
      // Cancel the subscription entirely if no listings remain
      await stripe.subscriptions.cancel(targetItem.subscriptionId);
      console.log("[REMOVE-LISTING-BILLING] Subscription canceled (no listings remain)");
    } else {
      await stripe.subscriptionItems.update(targetItem.itemId, {
        quantity: newQuantity,
      });
      console.log("[REMOVE-LISTING-BILLING] Subscription quantity updated to", newQuantity);
    }

    return new Response(JSON.stringify({ success: true, newQuantity }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[REMOVE-LISTING-BILLING] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
