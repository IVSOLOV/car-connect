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
import LoadingSpinner from "@/components/LoadingSpinner";

/**
 * Post-Stripe redirect handler.
 *
 * Behavior:
 *  - Verifies the Stripe session in the background.
 *  - Creates the pending listing in the background.
 *  - Does NOT render a full-screen Congratulations page.
 *  - Immediately navigates to /listing/:id (or /my-listings as fallback).
 *  - Shows a non-blocking sonner toast for ~4s.
 *  - Aggressively clears any pointer-events / inert / overflow locks
 *    before and after navigation so iOS isn't left frozen.
 */
const SUCCESS_LOCK_KEY = "listingCheckoutSuccessLock";
const VERIFY_TIMEOUT_MS = 9000;

type VerificationResult =
  | { status: "success" }
  | { status: "failed" }
  | { status: "timeout" };

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

const timeout = (ms: number) =>
  new Promise<{ status: "timeout" }>((resolve) => {
    window.setTimeout(() => resolve({ status: "timeout" }), ms);
  });

const ListingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { checkSubscription } = useListingSubscription();
  const handledRef = useRef(false);

  const paymentStatus = searchParams.get("payment");
  const sessionId = searchParams.get("session_id");

  // Always clear interaction locks the moment this route mounts.
  useEffect(() => {
    console.log("[ListingSuccess] Listing success handler mounted", {
      pathname: window.location.pathname,
      search: window.location.search,
      paymentStatus,
      sessionId: sessionId ? "present" : "missing",
    });
    clearGlobalInteractionLocks("ListingSuccess mount");
    const cancel = scheduleGlobalInteractionUnlock("ListingSuccess mount");
    return cancel;
  }, [paymentStatus, sessionId]);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    let cancelled = false;
    let completed = false;
    let fallbackTimer: number | undefined;

    const finish = (
      destination: string,
      variant: "success" | "warning" = "success",
    ) => {
      if (cancelled || completed) return;
      completed = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      console.log("[ListingSuccess] Navigating to listing or My Listings", {
        destination,
        variant,
      });

      // Clear locks BEFORE navigation
      clearGlobalInteractionLocks("ListingSuccess pre-navigate");

      navigate(destination, { replace: true });
      console.log("[ListingSuccess] Loader unmounted");

      // Clear locks AFTER navigation (next tick + delayed sweeps)
      scheduleGlobalInteractionUnlock("ListingSuccess post-navigate");

      // Non-blocking toast banner for 4s
      if (variant === "success") {
        console.log("[ListingSuccess] Success toast shown");
        toast.success(
          "Success! Your listing has been submitted for review and your 30-day free trial has started.",
          {
            duration: 4000,
            onAutoClose: () => {
              console.log("[ListingSuccess] Success toast dismissed");
              clearGlobalInteractionLocks("ListingSuccess toast dismissed");
            },
            onDismiss: () => {
              console.log("[ListingSuccess] Success toast dismissed (manual)");
              clearGlobalInteractionLocks("ListingSuccess toast dismissed");
            },
          }
        );
      } else {
        console.log("[ListingSuccess] Warning toast shown");
        toast.warning(
          "Payment completed. Your listing is being finalized and should appear shortly.",
          {
            duration: 4000,
            onAutoClose: () => {
              console.log("[ListingSuccess] Warning toast dismissed");
              clearGlobalInteractionLocks("ListingSuccess warning toast dismissed");
            },
            onDismiss: () => {
              console.log("[ListingSuccess] Warning toast dismissed (manual)");
              clearGlobalInteractionLocks("ListingSuccess warning toast dismissed");
            },
          }
        );
      }
    };

    const handleFailure = (reason: string) => {
      if (cancelled || completed) return;
      completed = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      console.warn("[ListingSuccess] Checkout failed/canceled:", reason);
      localStorage.removeItem("listingCheckoutPending");
      localStorage.removeItem("pendingListing");
      clearGlobalInteractionLocks("ListingSuccess failure");
      toast.error(
        reason === "canceled"
          ? "Checkout was canceled."
          : "We couldn't verify your payment. Please try again.",
        { duration: 4000 }
      );
      navigate("/create-listing", { replace: true });
      console.log("[ListingSuccess] Loader unmounted");
      scheduleGlobalInteractionUnlock("ListingSuccess failure post-navigate");
    };

    const run = async () => {
      fallbackTimer = window.setTimeout(() => {
        console.warn("[ListingSuccess] Verification timeout fallback triggered");
        clearGlobalInteractionLocks("ListingSuccess hard timeout fallback");
        finish("/my-listings", "warning");
      }, VERIFY_TIMEOUT_MS);

      // Handle explicit failure/cancel
      if (paymentStatus === "canceled") {
        handleFailure("canceled");
        return;
      }

      // Verify Stripe session if we have one
      if (paymentStatus === "success" && sessionId) {
        try {
          console.log("[ListingSuccess] Starting checkout verification");
          const verificationResult = await Promise.race<VerificationResult>([
            supabase.functions
              .invoke("verify-listing-checkout", { body: { session_id: sessionId } })
              .then(({ data, error }) => {
                if (error) throw error;
                return data?.paid ? { status: "success" as const } : { status: "failed" as const };
              })
              .catch((err) => {
                console.error("[ListingSuccess] Verification failed", err);
                return { status: "failed" as const };
              }),
            timeout(VERIFY_TIMEOUT_MS - 500),
          ]);
          if (cancelled) return;
          if (verificationResult.status === "timeout") {
            console.warn("[ListingSuccess] Verification timeout fallback triggered");
            finish("/my-listings", "warning");
            return;
          }
          if (verificationResult.status === "failed") {
            console.warn("[ListingSuccess] Verification failed");
            finish("/my-listings", "warning");
            return;
          }
          console.log("[ListingSuccess] Verification success");
          try {
            sessionStorage.setItem(SUCCESS_LOCK_KEY, sessionId);
          } catch {
            console.warn("[ListingSuccess] Unable to persist checkout success lock");
          }
        } catch (err) {
          console.error("[ListingSuccess] Verification failed", err);
          finish("/my-listings", "warning");
          return;
        }
      } else if (paymentStatus === "success" && !sessionId) {
        // Legacy fallback path: trust the URL flag
        try {
          sessionStorage.setItem(SUCCESS_LOCK_KEY, "legacy");
        } catch {
          console.warn("[ListingSuccess] Unable to persist legacy checkout success lock");
        }
      } else if (!sessionStorage.getItem(SUCCESS_LOCK_KEY)) {
        handleFailure("missing_status");
        return;
      }

      // Refresh subscription state (non-blocking)
      if (user) {
        checkSubscription().catch((err) =>
          console.error("[ListingSuccess] checkSubscription error:", err)
        );
      }

      // Create the pending listing
      let createdListingId: string | null = null;
      const pendingListingData = localStorage.getItem("pendingListing");
      if (user && pendingListingData) {
        try {
          const listing = JSON.parse(pendingListingData);
          const uploadedImageUrls: string[] = listing.imageUrls || [];

          const { data, error } = await db
            .from<{ id: string }>("listings")
            .insert({
              user_id: user.id,
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
            console.error("[ListingSuccess] Error creating listing:", error);
          } else {
            if (data?.id) {
              createdListingId = data.id;
              if (listing.licensePlate?.trim()) {
                const { error: sensitiveError } = await db
                  .from("listing_sensitive_data")
                  .insert({
                    listing_id: data.id,
                    license_plate: listing.licensePlate
                      .trim()
                      .toUpperCase(),
                    state: listing.state,
                  });
                if (sensitiveError)
                  console.error(
                    "[ListingSuccess] Error saving sensitive data:",
                    sensitiveError
                  );
              }
            }

            localStorage.removeItem("listingCheckoutPending");
            localStorage.removeItem("pendingListing");

            const { data: profile } = await db
              .from<{ first_name: string | null; full_name: string | null }>("profiles")
              .select("first_name, full_name")
              .eq("user_id", user.id)
              .single();

            const submitterName =
              profile?.first_name || profile?.full_name || "A user";
            const listingTitle = `${listing.year} ${listing.make} ${listing.model}`;

            sendNotificationEmail("admin_new_listing", null, {
              listingTitle,
              submitterName,
            }).catch((err) =>
              console.error(
                "[ListingSuccess] Failed to send admin notification:",
                err
              )
            );
          }
        } catch (err) {
          console.error(
            "[ListingSuccess] Error processing pending listing:",
            err
          );
        }
      }

      // Cleanup any stale flags
      localStorage.removeItem("listingCheckoutPending");

      if (completed) return;

      const destination = createdListingId
        ? `/listing/${createdListingId}`
        : "/my-listings";
      finish(destination, createdListingId ? "success" : "warning");
    };

    // Wait briefly for auth to restore from the Stripe redirect handoff,
    // then run regardless (createPendingListing only fires if user exists).
    const startDelay = window.setTimeout(run, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(startDelay);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      console.log("[ListingSuccess] Loader unmounted");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Minimal, non-blocking placeholder (no header/footer, no overlay layers).
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">
          Finalizing your listing…
        </p>
      </div>
    </div>
  );
};

export default ListingSuccess;
