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
    console.log("[CREATE-LISTING-CHECKOUT] Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    console.log("[CREATE-LISTING-CHECKOUT] User authenticated", { userId: user.id, email: user.email });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log("[CREATE-LISTING-CHECKOUT] Found existing customer", { customerId });
    }

    // Check for existing active subscription with the listing fee price
    let existingSubscription = null;
    let currentQuantity = 0;
    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });

      for (const sub of subscriptions.data) {
        for (const item of sub.items.data) {
          if (item.price.id === LISTING_FEE_PRICE_ID) {
            existingSubscription = { subscriptionId: sub.id, itemId: item.id };
            currentQuantity += item.quantity || 0;
          }
        }
      }

      // Also check trialing subscriptions
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 10,
      });

      for (const sub of trialingSubs.data) {
        for (const item of sub.items.data) {
          if (item.price.id === LISTING_FEE_PRICE_ID) {
            existingSubscription = { subscriptionId: sub.id, itemId: item.id };
            currentQuantity += item.quantity || 0;
          }
        }
      }
    }

    const { quantity = 1 } = await req.json().catch(() => ({}));

    // If user already has an active subscription, just increment the quantity (no checkout needed)
    if (existingSubscription) {
      const newQuantity = currentQuantity + quantity;
      console.log("[CREATE-LISTING-CHECKOUT] Updating existing subscription quantity", { 
        subscriptionId: existingSubscription.subscriptionId, 
        currentQuantity, 
        newQuantity 
      });

      await stripe.subscriptionItems.update(existingSubscription.itemId, {
        quantity: newQuantity,
      });

      // Return a flag indicating subscription was updated (no redirect needed)
      return new Response(JSON.stringify({ updated: true, newQuantity }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // First-time listing: create a new checkout session (collects payment method)
    const newQuantity = quantity;
    console.log("[CREATE-LISTING-CHECKOUT] Creating checkout session for new subscriber", { newQuantity });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: LISTING_FEE_PRICE_ID,
          quantity: newQuantity,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin") || "https://directrental.lovable.app"}/listing-success`,
      cancel_url: `${req.headers.get("origin") || "https://directrental.lovable.app"}/listing-success?payment=canceled`,
      custom_text: {
        submit: {
          message: "You will be charged $4.99/month per active listing. Cancel anytime by deleting your listing.",
        },
      },
      metadata: {
        user_id: user.id,
        new_listings: quantity.toString(),
      },
    });

    console.log("[CREATE-LISTING-CHECKOUT] Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CREATE-LISTING-CHECKOUT] ERROR:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
