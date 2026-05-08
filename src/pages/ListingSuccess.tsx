import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { useListingSubscription } from "@/hooks/useListingSubscription";
import { supabase } from "@/integrations/supabase/client";
import { sendNotificationEmail } from "@/lib/notifications";
import {
  clearGlobalInteractionLocks,
  scheduleGlobalInteractionUnlock,
} from "@/lib/interactionReset";

const PROCESSED_KEY_PREFIX = "listing_success_processed_";
const TOAST_KEY_PREFIX = "listing_success_toast_";
const processedSessionsInMemory = new Set<string>();
const toastShownInMemory = new Set<string>();

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

const wasToastShown = (key: string): boolean => {
  if (toastShownInMemory.has(key)) return true;
  try {
    return localStorage.getItem(`${TOAST_KEY_PREFIX}${key}`) !== null;
  } catch {
    return false;
  }
};

const markToastShown = (key: string) => {
  toastShownInMemory.add(key);
  try {
    localStorage.setItem(`${TOAST_KEY_PREFIX}${key}`, String(Date.now()));
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

  const goToMyListings = useCallback(
    (source: string) => {
      console.log(`${source} clicked`);
      console.log("Navigating to /my-listings");
      clearGlobalInteractionLocks(`ListingSuccess ${source}`);
      try {
        toast.dismiss();
      } catch {
        /* ignore */
      }
      navigate("/my-listings", { replace: true });
    },
    [navigate]
  );

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
    const toastKey = sessionId || (canceled ? "canceled" : "no-session");

    if (!wasToastShown(toastKey)) {
      markToastShown(toastKey);
      window.setTimeout(() => {
        toast.dismiss();
        if (canceled) {
          toast.warning("Checkout was canceled.", { id: `ls-${toastKey}`, duration: 4000 });
        } else {
          toast.success(
            "Congratulations! Your listing was submitted for review and your 30-day free trial has started.",
            { id: `ls-${toastKey}`, duration: 4000 }
          );
        }
        console.log("Success toast shown");
      }, 80);
    }

    if (canceled) {
      localStorage.removeItem("listingCheckoutPending");
      localStorage.removeItem("pendingListing");
      return;
    }

    if (isSessionProcessed(sessionId)) {
      console.log("Duplicate checkout session detected — skipping listing creation", { sessionId });
      localStorage.removeItem("listingCheckoutPending");
      localStorage.removeItem("pendingListing");
      return;
    }

    markSessionProcessed(sessionId);

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
            }
          } catch (err) {
            console.error("[ListingSuccess][bg] Verification error", err);
          }
        }

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

        const pendingListingData = localStorage.getItem("pendingListing");
        if (currentUser && pendingListingData && sessionId) {
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

  const canceled = searchParams.get("payment") === "canceled";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main
        className="container mx-auto px-4 py-8 pt-36 sm:pt-24"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)",
        }}
      >
        <div className="max-w-2xl mx-auto">
          <Card className="relative">
            <button
              type="button"
              aria-label="Close"
              onClick={() => goToMyListings("Close success")}
              className="absolute top-3 right-3 z-10 inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <CardContent className="py-10 px-6 sm:px-10 text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-5">
                  <CheckCircle2 className="h-14 w-14 text-primary" strokeWidth={2} />
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {canceled ? "Checkout canceled" : "Congratulations!"}
              </h1>
              <p className="text-base leading-relaxed text-muted-foreground max-w-md mx-auto">
                {canceled
                  ? "Your checkout was canceled. You can try again from My Listings."
                  : "Your listing was submitted for review and your 30-day free trial has started."}
              </p>
              <div className="pt-2">
                <Button
                  size="lg"
                  className="w-full sm:w-auto sm:min-w-[260px] h-12 text-base"
                  onClick={() => goToMyListings("See My Listings")}
                >
                  See My Listings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ListingSuccess;
