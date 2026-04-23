import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id;
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ paid: false, error: "Missing session_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    // For subscription mode with trial, "complete" status + active/trialing subscription = paid
    const subscription = session.subscription as Stripe.Subscription | null;
    const subStatus = typeof subscription === "object" && subscription ? subscription.status : null;

    const isComplete = session.status === "complete";
    const subOk = subStatus === "active" || subStatus === "trialing";
    const paid = isComplete && subOk;

    console.log("[VERIFY-CHECKOUT]", { sessionId, sessionStatus: session.status, subStatus, paid });

    return new Response(
      JSON.stringify({
        paid,
        sessionStatus: session.status,
        paymentStatus: session.payment_status,
        subscriptionStatus: subStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[VERIFY-CHECKOUT] ERROR:", errorMessage);
    return new Response(JSON.stringify({ paid: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
