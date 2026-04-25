import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    // Persist subscription to our DB so it shows up in our records immediately,
    // even though the first charge happens after the 30-day trial.
    if (paid && subscription && typeof subscription === "object") {
      try {
        const userId = session.metadata?.user_id ?? null;
        const customerId = typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;
        const quantity = subscription.items?.data?.[0]?.quantity ?? 1;
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;
        const periodEnd = (subscription as any).current_period_end
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : null;

        if (userId && customerId) {
          const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { persistSession: false } },
          );

          const { error: upsertError } = await supabaseAdmin
            .from("listing_subscriptions")
            .upsert(
              {
                user_id: userId,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                stripe_checkout_session_id: session.id,
                subscription_status: subscription.status,
                trial_end: trialEnd,
                current_period_end: periodEnd,
                quantity,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "stripe_subscription_id" },
            );

          if (upsertError) {
            console.error("[VERIFY-CHECKOUT] Failed to persist subscription", upsertError);
          } else {
            console.log("[VERIFY-CHECKOUT] Subscription persisted", {
              subscriptionId: subscription.id,
              userId,
              customerId,
            });
          }
        } else {
          console.warn("[VERIFY-CHECKOUT] Missing userId or customerId; skipping persist", {
            userId,
            customerId,
          });
        }
      } catch (persistErr) {
        // Never let persistence failure break the user's success flow
        console.error("[VERIFY-CHECKOUT] Persist exception:", persistErr);
      }
    }

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
