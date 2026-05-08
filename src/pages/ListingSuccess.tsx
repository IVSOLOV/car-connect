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
 * Post-Stripe redirect handler.
 *
 * INVISIBLE to the user:
 *  - Navigates immediately to /listing/:id or /my-listings on mount.
 *  - Shows a non-blocking sonner toast (~4s).
 *  - Runs verification + listing creation in the background AFTER navigation.
 *  - Never renders a loader screen.
 */
const SUCCESS_LOCK_KEY = "listingCheckoutSuccessLock";

type DbError = { message?: string } | null;
type InsertOnlyResult = { error: DbError };
type InsertSelectResult<T> = { data: T | null; error: DbError };
type InsertSelectBuilder<T> = PromiseLike<InsertOnlyResult> & {
  select: (columns: string) => { single: () => Promise<InsertSelectResult<T>> };
};
type UntypedTable<T> = {
  insert: (values: Record<string, unknown>) => InsertSelectBuilder<T>;
  select: (columns: string) => {
    eq: (column: string, value: string) => { single: () => Promise<InsertSelectResult<T>> };
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
    const listingIdParam =
      searchParams.get("listingId") || searchParams.get("listing_id");

    console.log("[ListingSuccess] Mounted - navigating immediately", {
      paymentStatus,
      hasSessionId: Boolean(sessionId),
      listingIdParam: listingIdParam || "missing",
    });

    // 1) Clear any interaction locks immediately.
    clearGlobalInteractionLocks("ListingSuccess mount");
    scheduleGlobalInteractionUnlock("ListingSuccess mount");

    // 2) Decide destination and navigate IMMEDIATELY (before any async work).
    const canceled = paymentStatus === "canceled";
    const destination = canceled
      ? "/my-listings"
      : listingIdParam
      ? `/listing/${listingIdParam}`
      : "/my-listings";

    navigate(destination, { replace: true });
    console.log("[ListingSuccess] Navigated to", destination);

    // 3) Show non-blocking toast.
    if (canceled) {
      toast.warning("Checkout was canceled.", { duration: 4000 });
    } else {
      toast.success(
        "Congratulations! Your listing was submitted for review and your 30-day free trial has started.",
        { duration: 4000 }
      );
    }

    // 4) Re-clear locks after navigation completes.
    scheduleGlobalInteractionUnlock("ListingSuccess post-navigate");

    if (canceled) {
      localStorage.removeItem("listingCheckoutPending");
      localStorage.removeItem("pendingListing");
      console.log("Listing success flow completed safely");
      return;
    }

    // 5) Background verification + listing creation. NEVER blocks the UI.
    const runBackground = async () => {
      try {
        if (sessionId) {
          try {
            const { data, error } = await supabase.functions.invoke(
              "verify-listing-checkout",
              { body: { session_id: sessionId } }
            );
            if (error) throw error;
            if (!data?.paid) {
              console.warn("[ListingSuccess][bg] Verification reported unpaid");
            } else {
              try {
                sessionStorage.setItem(SUCCESS_LOCK_KEY, sessionId);
              } catch {
                /* ignore */
              }
            }
          } catch (err) {
            console.error("[ListingSuccess][bg] Verification error", err);
          }
        }

        const currentUser = userRef.current;
        if (currentUser) {
          checkSubscription().catch((err) =>
            console.error("[ListingSuccess][bg] checkSubscription error:", err)
          );
        }

        const pendingListingData = localStorage.getItem("pendingListing");
        if (currentUser && pendingListingData) {
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
                weekly_price: listing.weeklyPrice
                  ? parseInt(listing.weeklyPrice)
                  : null,
                monthly_price: listing.monthlyPrice
                  ? parseInt(listing.monthlyPrice)
                  : null,
                description: listing.description || null,
                images: uploadedImageUrls,
                delivery_available: listing.deliveryAvailable || false,
                approval_status: "pending",
              })
              .select("id")
              .single();

            if (error) {
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
                  console.error(
                    "[ListingSuccess][bg] Error saving sensitive data:",
                    sensitiveError
                  );
                }
              }

              localStorage.removeItem("listingCheckoutPending");
              localStorage.removeItem("pendingListing");

              const { data: profile } = await db
                .from<{ first_name: string | null; full_name: string | null }>(
                  "profiles"
                )
                .select("first_name, full_name")
                .eq("user_id", currentUser.id)
                .single();

              const submitterName =
                profile?.first_name || profile?.full_name || "A user";
              const listingTitle = `${listing.year} ${listing.make} ${listing.model}`;

              sendNotificationEmail("admin_new_listing", null, {
                listingTitle,
                submitterName,
              }).catch((err) =>
                console.error(
                  "[ListingSuccess][bg] Failed to send admin notification:",
                  err
                )
              );
            }
          } catch (err) {
            console.error(
              "[ListingSuccess][bg] Error processing pending listing:",
              err
            );
          }
        }

        localStorage.removeItem("listingCheckoutPending");
      } finally {
        clearGlobalInteractionLocks("ListingSuccess background complete");
        console.log("Listing success flow completed safely");
      }
    };

    // Defer slightly so navigation/render finishes first.
    window.setTimeout(() => {
      void runBackground();
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render nothing - user should never see this route.
  return null;
};

export default ListingSuccess;
