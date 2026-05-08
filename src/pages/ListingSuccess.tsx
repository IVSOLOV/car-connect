import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useListingSubscription } from "@/hooks/useListingSubscription";
import { supabase } from "@/integrations/supabase/client";
import { sendNotificationEmail } from "@/lib/notifications";
import {
  clearGlobalInteractionLocks,
  scheduleGlobalInteractionUnlock,
} from "@/lib/interactionReset";

/**
 * Post-Stripe redirect handler. INVISIBLE to the user.
 * Always navigates to /my-listings first, then shows a toast.
 * Listing creation is IDEMPOTENT keyed on Stripe checkout_session_id:
 *   - in-memory Set guard (per app session)
 *   - localStorage guard `listing_success_processed_<session_id>`
 *   - DB unique index on listings.stripe_checkout_session_id
 */

const PROCESSED_KEY_PREFIX = "listing_success_processed_";
// Module-level in-memory lock - survives component remounts within the same JS session.
const processedSessionsInMemory = new Set<string>();

const isSessionProcessed = (sessionId: string | null): boolean => {
  if (!sessionId) return false;
  if (processedSessionsInMemory.has(sessionId)) return true;
  try {
    return localStorage.getItem(`${PROCESSED_KEY_PREFIX}${sessionId}`) !== null;
  } catch {
    return false;
  }
};

const markSessionProcessed = (sessionId: string | null) => {
  if (!sessionId) return;
  processedSessionsInMemory.add(sessionId);
  try {
    localStorage.setItem(`${PROCESSED_KEY_PREFIX}${sessionId}`, String(Date.now()));
  } catch {
    /* ignore */
  }
};

type DbError = { message?: string; code?: string } | null;
type InsertOnlyResult = { error: DbError };
type InsertSelectResult<T> = { data: T | null; error: DbError };
type InsertSelectBuilder<T> = PromiseLike<InsertOnlyResult> & {
  select: (columns: string) => { single: () => Promise<InsertSelectResult<T>> };
};
type UntypedTable<T> = {
  insert: (values: Record<string, unknown>) => InsertSelectBuilder<T>;
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<InsertSelectResult<T>>;
      single: () => Promise<InsertSelectResult<T>>;
    };
  };
};
type UntypedSupabase = {
  from: <T = unknown>(table: string) => UntypedTable<T>;
};

const db = supabase as unknown as UntypedSupabase;

const ListingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { checkSubscription } = useListingSubscription();
  const handledRef = useRef(false);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const paymentStatus = searchParams.get("payment");
    const sessionId =
      searchParams.get("session_id") ||
      searchParams.get("session") ||
      searchParams.get("checkout_session");

    console.log("[ListingSuccess] Mounted", {
      paymentStatus,
      hasSessionId: Boolean(sessionId),
      sessionId: sessionId || "(none)",
    });

    clearGlobalInteractionLocks("ListingSuccess mount");
    scheduleGlobalInteractionUnlock("ListingSuccess mount");

    const canceled = paymentStatus === "canceled";
    const alreadyProcessed = !canceled && isSessionProcessed(sessionId);

    if (alreadyProcessed) {
      console.log(
        "Duplicate checkout session detected — skipping listing creation",
        { sessionId }
      );
    }

    // ALWAYS navigate to /my-listings first.
    navigate("/my-listings", { replace: true });
    console.log("Navigated to /my-listings");

    // Toast on next tick.
    window.setTimeout(() => {
      if (canceled) {
        toast.warning("Checkout was canceled.", { duration: 4000 });
      } else {
        toast.success(
          "Congratulations! Your listing was submitted for review and your 30-day free trial has started.",
          { duration: 4000 }
        );
      }
      console.log("Success toast shown");
    }, 80);

    scheduleGlobalInteractionUnlock("ListingSuccess post-navigate");

    if (canceled) {
      localStorage.removeItem("listingCheckoutPending");
      localStorage.removeItem("pendingListing");
      console.log("Listing success flow completed safely");
      return;
    }

    if (alreadyProcessed) {
      // Clean any stale pending payload but DO NOT insert again.
      localStorage.removeItem("listingCheckoutPending");
      localStorage.removeItem("pendingListing");
      console.log("Listing success flow completed safely (idempotent skip)");
      return;
    }

    // Mark immediately to block concurrent remounts/deep-link re-fires.
    markSessionProcessed(sessionId);

    const runBackground = async () => {
      try {
        // 1) Verify checkout (also persists subscription server-side).
        if (sessionId) {
          try {
            const { data, error } = await supabase.functions.invoke(
              "verify-listing-checkout",
              { body: { session_id: sessionId } }
            );
            if (error) throw error;
            if (!data?.paid) {
              console.warn("[ListingSuccess][bg] Verification reported unpaid");
            }
          } catch (err) {
            console.error("[ListingSuccess][bg] Verification error", err);
          }
        }

        // Resolve user reliably: AuthContext may not have hydrated yet right after
        // a Stripe redirect, so fall back to supabase.auth.getUser() and poll briefly.
        let currentUser = userRef.current;
        if (!currentUser) {
          for (let i = 0; i < 10; i += 1) {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
              currentUser = authData.user as typeof currentUser;
              break;
            }
            await new Promise((r) => setTimeout(r, 300));
          }
        }
        console.log("[ListingSuccess][bg] resolved user:", currentUser?.id ?? "(none)");

        if (currentUser) {
          checkSubscription().catch((err) =>
            console.error("[ListingSuccess][bg] checkSubscription error:", err)
          );
        }

        // 2) Create the listing - idempotent on stripe_checkout_session_id.
        const pendingListingData = localStorage.getItem("pendingListing");
        if (currentUser && pendingListingData && sessionId) {
          // DB-level pre-check.
          const { data: existing } = await db
            .from<{ id: string }>("listings")
            .select("id")
            .eq("stripe_checkout_session_id", sessionId)
            .maybeSingle();

          if (existing?.id) {
            console.log(
              "Duplicate checkout session detected — skipping listing creation",
              { sessionId, existingListingId: existing.id }
            );
            localStorage.removeItem("listingCheckoutPending");
            localStorage.removeItem("pendingListing");
            return;
          }

          try {
            const listing = JSON.parse(pendingListingData);
            const uploadedImageUrls: string[] = listing.imageUrls || [];

            const { data, error } = await db
              .from<{ id: string }>("listings")
              .insert({
                user_id: currentUser.id,
                year: parseInt(listing.year),
                make: listing.make,
                model: listing.model,
                city: listing.city,
                state: listing.state,
                title_status: listing.titleStatus,
                vehicle_type: listing.vehicleType,
                fuel_type: listing.fuelType,
                daily_price: parseInt(listing.dailyPrice),
                weekly_price: listing.weeklyPrice ? parseInt(listing.weeklyPrice) : null,
                monthly_price: listing.monthlyPrice ? parseInt(listing.monthlyPrice) : null,
                description: listing.description || null,
                images: uploadedImageUrls,
                delivery_available: listing.deliveryAvailable || false,
                approval_status: "pending",
                stripe_checkout_session_id: sessionId,
              })
              .select("id")
              .single();

            if (error) {
              // Unique violation (23505) = another insert won the race - that's fine.
              if (error.code === "23505") {
                console.log(
                  "Duplicate checkout session detected — skipping listing creation",
                  { sessionId, reason: "unique_violation" }
                );
                localStorage.removeItem("listingCheckoutPending");
                localStorage.removeItem("pendingListing");
                return;
              }
              console.error("[ListingSuccess][bg] Error creating listing:", error);
            } else if (data?.id) {
              if (listing.licensePlate?.trim()) {
                const { error: sensitiveError } = await db
                  .from("listing_sensitive_data")
                  .insert({
                    listing_id: data.id,
                    license_plate: listing.licensePlate.trim().toUpperCase(),
                    state: listing.state,
                  });
                if (sensitiveError) {
                  console.error("[ListingSuccess][bg] Error saving sensitive data:", sensitiveError);
                }
              }

              localStorage.removeItem("listingCheckoutPending");
              localStorage.removeItem("pendingListing");

              const { data: profile } = await db
                .from<{ first_name: string | null; full_name: string | null }>("profiles")
                .select("first_name, full_name")
                .eq("user_id", currentUser.id)
                .single();

              const submitterName = profile?.first_name || profile?.full_name || "A user";
              const listingTitle = `${listing.year} ${listing.make} ${listing.model}`;

              sendNotificationEmail("admin_new_listing", null, {
                listingTitle,
                submitterName,
              }).catch((err) =>
                console.error("[ListingSuccess][bg] Failed to send admin notification:", err)
              );

              console.log("Listing created/finalized for checkout session:", sessionId);
            }
          } catch (err) {
            console.error("[ListingSuccess][bg] Error processing pending listing:", err);
          }
        }

        localStorage.removeItem("listingCheckoutPending");
      } finally {
        clearGlobalInteractionLocks("ListingSuccess background complete");
        console.log("Listing success flow completed safely");
      }
    };

    window.setTimeout(() => {
      void runBackground();
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default ListingSuccess;
