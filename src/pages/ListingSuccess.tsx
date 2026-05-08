import { useEffect, useRef, useState } from "react";
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
const MISSING_PARAMS_TIMEOUT_MS = 3000;

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

const getCurrentRoute = () =>
  typeof window === "undefined" ? "unknown" : `${window.location.pathname}${window.location.search}`;

const ListingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { checkSubscription } = useListingSubscription();
  const handledRef = useRef(false);
  const userRef = useRef(user);

  const paymentStatus = searchParams.get("payment");
  const sessionId = searchParams.get("session_id") || searchParams.get("session") || searchParams.get("checkout_session");
  const listingIdParam = searchParams.get("listingId") || searchParams.get("listing_id");
  const [debugState, setDebugState] = useState({
    timerStarted: false,
    fallbackFired: false,
    navigationAttempted: false,
    currentRoute: getCurrentRoute(),
    exitReason: "mounted",
  });

  useEffect(() => {
    userRef.current = user;
    console.log("[ListingSuccess] Auth state observed", { hasUser: Boolean(user?.id) });
  }, [user]);

  const updateDebug = (patch: Partial<typeof debugState>) => {
    setDebugState((current) => ({
      ...current,
      ...patch,
      currentRoute: getCurrentRoute(),
    }));
  };

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
    if (handledRef.current) {
      console.warn("[ListingSuccess] Exit path: handler already active for this route setup");
      return;
    }
    handledRef.current = true;

    let cancelled = false;
    let completed = false;
    let startDelay: number | undefined;
    let fallbackTimer: number | undefined;
    let missingParamsTimer: number | undefined;
    const logExit = (reason: string, details?: Record<string, unknown>) => {
      console.log("[ListingSuccess] Exit path:", reason, details ?? {});
      updateDebug({ exitReason: reason });
    };

    const finish = (
      destination: string,
      variant: "success" | "warning" = "success",
      reason = "finish",
    ) => {
      if (cancelled) {
        logExit("finish skipped because effect was cancelled", { destination, reason });
        return;
      }
      if (completed) {
        logExit("finish skipped because flow already completed", { destination, reason });
        return;
      }
      completed = true;
      if (startDelay) window.clearTimeout(startDelay);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(missingParamsTimer);
      updateDebug({ navigationAttempted: true, exitReason: reason });
      console.log("[ListingSuccess] Navigating to listing or My Listings", {
        destination,
        variant,
        reason,
      });

      // Clear locks BEFORE navigation
      clearGlobalInteractionLocks("ListingSuccess pre-navigate");

      navigate(destination, { replace: true });
      console.log("[ListingSuccess] Loader unmounted");

      // Clear locks AFTER navigation (next tick + delayed sweeps)
      scheduleGlobalInteractionUnlock("ListingSuccess post-navigate");
      console.log("Listing success flow completed safely");

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
      if (cancelled) {
        logExit("failure skipped because effect was cancelled", { reason });
        return;
      }
      if (completed) {
        logExit("failure skipped because flow already completed", { reason });
        return;
      }
      completed = true;
      if (startDelay) window.clearTimeout(startDelay);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(missingParamsTimer);
      updateDebug({ navigationAttempted: true, exitReason: reason });
      console.warn("[ListingSuccess] Checkout failed/canceled:", reason);
      localStorage.removeItem("listingCheckoutPending");
      localStorage.removeItem("pendingListing");
      clearGlobalInteractionLocks("ListingSuccess failure");
      toast.warning(
        reason === "canceled"
          ? "Checkout was canceled."
          : "Payment completed. Your listing is being finalized and should appear shortly.",
        { duration: 4000 }
      );
      navigate("/my-listings", { replace: true });
      console.log("[ListingSuccess] Loader unmounted");
      scheduleGlobalInteractionUnlock("ListingSuccess failure post-navigate");
      console.log("Listing success flow completed safely");
    };

    console.log("[ListingSuccess] Confirming 9-second fallback timer starts on mount", {
      timeoutMs: VERIFY_TIMEOUT_MS,
      route: getCurrentRoute(),
    });
    updateDebug({ timerStarted: true, exitReason: "fallback timer started" });
    fallbackTimer = window.setTimeout(() => {
      console.warn("[ListingSuccess] Verification timeout fallback triggered");
      updateDebug({ fallbackFired: true, exitReason: "9-second fallback fired" });
      clearGlobalInteractionLocks("ListingSuccess hard timeout fallback");
      finish("/my-listings", "warning", "9-second verification timeout fallback");
    }, VERIFY_TIMEOUT_MS);

    missingParamsTimer = window.setTimeout(() => {
      if (completed || cancelled) {
        logExit("missing params timer ignored", { completed, cancelled });
        return;
      }
      if (paymentStatus !== "success" || (!sessionId && !listingIdParam)) {
        console.warn("[ListingSuccess] Missing required success params; navigating fallback", {
          paymentStatus,
          hasSessionId: Boolean(sessionId),
          listingIdParam: listingIdParam || "missing",
        });
        finish("/my-listings", "warning", "missing required params fallback");
        return;
      }
      logExit("missing params check passed", {
        paymentStatus,
        hasSessionId: Boolean(sessionId),
        listingIdParam: listingIdParam || "missing",
      });
    }, MISSING_PARAMS_TIMEOUT_MS);

    const run = async () => {
      if (cancelled || completed) {
        logExit("run skipped", { cancelled, completed });
        return;
      }

      // Handle explicit failure/cancel
      if (paymentStatus === "canceled") {
        logExit("payment canceled branch");
        handleFailure("canceled");
        return;
      }

      if (listingIdParam && !sessionId && paymentStatus === "success") {
        console.warn("[ListingSuccess] Success URL has listingId but no session; using safe listing fallback", {
          listingIdParam,
        });
        finish(`/listing/${listingIdParam}`, "warning", "listingId param fallback without session");
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
          if (cancelled) {
            logExit("verification resolved after effect cancellation");
            return;
          }
          if (completed) {
            logExit("verification resolved after fallback completion");
            return;
          }
          if (verificationResult.status === "timeout") {
            console.warn("[ListingSuccess] Verification timeout fallback triggered");
            updateDebug({ fallbackFired: true });
            finish("/my-listings", "warning", "verification promise race timeout");
            return;
          }
          if (verificationResult.status === "failed") {
            console.warn("[ListingSuccess] Verification failed");
            finish("/my-listings", "warning", "verification failed");
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
          finish("/my-listings", "warning", "verification exception");
          return;
        }
      } else if (paymentStatus === "success" && !sessionId) {
        // Legacy fallback path: trust the URL flag
        logExit("success without session_id; legacy fallback continuing");
        try {
          sessionStorage.setItem(SUCCESS_LOCK_KEY, "legacy");
        } catch {
          console.warn("[ListingSuccess] Unable to persist legacy checkout success lock");
        }
      } else if (!sessionStorage.getItem(SUCCESS_LOCK_KEY)) {
        logExit("missing status and no success lock");
        handleFailure("missing_status");
        return;
      }

      // Refresh subscription state (non-blocking)
      const currentUser = userRef.current;
      if (currentUser) {
        checkSubscription().catch((err) =>
          console.error("[ListingSuccess] checkSubscription error:", err)
        );
      } else {
        logExit("no restored user before optional subscription refresh");
      }

      // Create the pending listing
      let createdListingId: string | null = null;
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
      } else {
        logExit("skipping pending listing insert", {
          hasUser: Boolean(currentUser?.id),
          hasPendingListingData: Boolean(pendingListingData),
        });
      }

      // Cleanup any stale flags
      localStorage.removeItem("listingCheckoutPending");

      if (completed) {
        logExit("post-insert finish skipped because already completed");
        return;
      }

      const destination = createdListingId
        ? `/listing/${createdListingId}`
        : "/my-listings";
      finish(destination, createdListingId ? "success" : "warning", "final destination after verification/listing processing");
    };

    // Wait briefly for auth to restore from the Stripe redirect handoff,
    // then run regardless (createPendingListing only fires if user exists).
    startDelay = window.setTimeout(run, 600);

    return () => {
      cancelled = true;
      handledRef.current = false;
      if (startDelay) window.clearTimeout(startDelay);
      window.clearTimeout(fallbackTimer);
      window.clearTimeout(missingParamsTimer);
      console.log("[ListingSuccess] Loader unmounted");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, paymentStatus, sessionId, listingIdParam]);

  // Minimal, non-blocking placeholder (no header/footer, no overlay layers).
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">
          Finalizing your listing…
        </p>
        <div className="w-full rounded-md border border-border bg-card p-4 text-left text-xs text-card-foreground shadow-sm">
          <p className="font-semibold text-foreground">Listing success debug</p>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 break-words">
            <dt className="text-muted-foreground">payment</dt>
            <dd>{paymentStatus || "missing"}</dd>
            <dt className="text-muted-foreground">session</dt>
            <dd>{sessionId || "missing"}</dd>
            <dt className="text-muted-foreground">listingId</dt>
            <dd>{listingIdParam || "missing"}</dd>
            <dt className="text-muted-foreground">timer started</dt>
            <dd>{debugState.timerStarted ? "yes" : "no"}</dd>
            <dt className="text-muted-foreground">fallback fired</dt>
            <dd>{debugState.fallbackFired ? "yes" : "no"}</dd>
            <dt className="text-muted-foreground">navigation attempted</dt>
            <dd>{debugState.navigationAttempted ? "yes" : "no"}</dd>
            <dt className="text-muted-foreground">current route</dt>
            <dd>{debugState.currentRoute}</dd>
            <dt className="text-muted-foreground">last branch</dt>
            <dd>{debugState.exitReason}</dd>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default ListingSuccess;
