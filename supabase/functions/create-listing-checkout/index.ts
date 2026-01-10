import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get existing quantity from active subscriptions
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
            currentQuantity += item.quantity || 0;
          }
        }
      }
    }

    // Parse request body for quantity (number of new listings to add)
    const { quantity = 1 } = await req.json().catch(() => ({}));
    const newQuantity = currentQuantity + quantity;

    console.log("[CREATE-LISTING-CHECKOUT] Creating checkout session", { currentQuantity, newListings: quantity, newQuantity });

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
      success_url: `${req.headers.get("origin")}/create-listing?payment=success`,
      cancel_url: `${req.headers.get("origin")}/create-listing?payment=canceled`,
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
