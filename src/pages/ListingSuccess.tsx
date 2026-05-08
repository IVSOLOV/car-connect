import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Car, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useListingSubscription } from "@/hooks/useListingSubscription";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LoadingSpinner from "@/components/LoadingSpinner";
import { sendNotificationEmail } from "@/lib/notifications";
import { clearGlobalInteractionLocks, getInteractionSnapshot, scheduleGlobalInteractionUnlock } from "@/lib/interactionReset";

type VerifyState = "verifying" | "success" | "failed";

// Persist success across remounts (e.g., duplicate iOS deep-link events that
// re-open the page without query params). Once Stripe confirms payment, we
// lock into success and never allow a downgrade to "failed".
const SUCCESS_LOCK_KEY = "listingCheckoutSuccessLock";

const readSuccessLock = (): string | null => {
  try {
    return sessionStorage.getItem(SUCCESS_LOCK_KEY);
  } catch {
    return null;
  }
};

const writeSuccessLock = (sessionId: string | null) => {
  try {
    sessionStorage.setItem(SUCCESS_LOCK_KEY, sessionId || "legacy");
  } catch {
    // ignore
  }
};

const describeEventTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return String(target);
  const id = target.id ? `#${target.id}` : "";
  const classes = target instanceof HTMLElement && target.className
    ? `.${String(target.className).trim().split(/\s+/).slice(0, 3).join(".")}`
    : "";
  const role = target.getAttribute("role") ? `[role=${target.getAttribute("role")}]` : "";
  const state = target.getAttribute("data-state") ? `[data-state=${target.getAttribute("data-state")}]` : "";
  return `${target.tagName.toLowerCase()}${id}${classes}${role}${state}`;
};

const getPointFromEvent = (event: PointerEvent | TouchEvent) => {
  if ("touches" in event && event.touches.length > 0) {
    return { x: Math.round(event.touches[0].clientX), y: Math.round(event.touches[0].clientY) };
  }

  if ("changedTouches" in event && event.changedTouches.length > 0) {
    return { x: Math.round(event.changedTouches[0].clientX), y: Math.round(event.changedTouches[0].clientY) };
  }

  return { x: Math.round((event as PointerEvent).clientX), y: Math.round((event as PointerEvent).clientY) };
};

const diagnoseInteractionBlocker = (
  snapshot: ReturnType<typeof getInteractionSnapshot>,
  verifyState: VerifyState,
  isCreatingListing: boolean,
  listingCreated: boolean,
) => {
  const bodyLocked = snapshot.bodyPointerEvents === "none";
  const htmlLocked = snapshot.htmlPointerEvents === "none";
  const rootLocked = snapshot.rootPointerEvents === "none" || snapshot.rootInert;
  const reactOverlay = verifyState === "verifying" || (isCreatingListing && !listingCreated);
  const fixedBlocker = snapshot.activeOverlays.find((overlay) => overlay.includes("fixed") && overlay.includes("pe=auto"));

  if (bodyLocked || htmlLocked || rootLocked) return "body/html/root lock";
  if (reactOverlay) return "React loading overlay";
  if (fixedBlocker) return "invisible overlay/CSS layer possible";
  return "none detected; if clicks log but no route changes, navigation handler";
};

const ListingSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { checkSubscription } = useListingSubscription();
  const { toast } = useToast();
  const [hasWaited, setHasWaited] = useState(false);
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  const [listingCreated, setListingCreated] = useState(false);
  const [newListingId, setNewListingId] = useState<string | null>(null);
  const [debugSnapshot, setDebugSnapshot] = useState(() => getInteractionSnapshot());
  const [lastDocumentTap, setLastDocumentTap] = useState("none");
  const [lastButtonClick, setLastButtonClick] = useState("none");
  const [detectedBlocker, setDetectedBlocker] = useState("checking");
  const creationStartedRef = useRef(false);
  const overlayVisibleRef = useRef(false);

  const paymentStatus = searchParams.get("payment");
  const sessionId = searchParams.get("session_id");

  // Start as "verifying" if we have a session_id to check; otherwise trust the URL flag.
  // If we previously locked success in this browser session, always start in success.
  const [verifyState, setVerifyStateRaw] = useState<VerifyState>(() => {
    if (readSuccessLock()) return "success";
    if (paymentStatus === "canceled") return "failed";
    if (paymentStatus === "success" && sessionId) return "verifying";
    if (paymentStatus === "success" && !sessionId) {
      writeSuccessLock(null);
      return "success"; // legacy fallback
    }
    return "failed";
  });

  // Guarded setter: once success is reached, NEVER allow flipping back to failed/verifying.
  const setVerifyState = (next: VerifyState) => {
    setVerifyStateRaw((prev) => {
      if (prev === "success") return "success";
      if (next === "success") writeSuccessLock(sessionId);
      return next;
    });
  };

  const activeOverlayStates = useCallback(() => [
    `verifyState=${verifyState}`,
    `loading=${loading}`,
    `hasWaited=${hasWaited}`,
    `isCreatingListing=${isCreatingListing}`,
    `listingCreated=${listingCreated}`,
  ], [hasWaited, isCreatingListing, listingCreated, loading, verifyState]);

  const refreshDebugSnapshot = useCallback((source: string, shouldLog = true) => {
    const snapshot = getInteractionSnapshot();
    const blocker = diagnoseInteractionBlocker(snapshot, verifyState, isCreatingListing, listingCreated);
    setDebugSnapshot(snapshot);
    setDetectedBlocker(blocker);
    if (shouldLog) {
      console.log(`[ListingSuccess][Debug] ${source}`, {
        paymentStatus,
        sessionId: sessionId ? "present" : "missing",
        detectedBlocker: blocker,
        activeOverlayStates: activeOverlayStates(),
        ...snapshot,
      });
    }
    return snapshot;
  }, [activeOverlayStates, isCreatingListing, listingCreated, paymentStatus, sessionId, verifyState]);

  const logButtonClick = useCallback((label: string, destination?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLastButtonClick(`${timestamp} ${label}`);
    console.log(`[ListingSuccess] ${label}`, {
      destination,
      paymentStatus,
      sessionId: sessionId ? "present" : "missing",
      activeOverlayStates: activeOverlayStates(),
      ...refreshDebugSnapshot(`button:${label}`),
    });
  }, [activeOverlayStates, paymentStatus, refreshDebugSnapshot, sessionId]);

  const goToListing = () => {
    const destination = newListingId ? `/listing/${newListingId}` : "/my-listings";
    logButtonClick("See My Listing clicked", destination);
    navigate(destination);
  };

  const goToCreateListing = () => {
    logButtonClick("Create New Listing clicked", "/create-listing");
    navigate("/create-listing");
  };

  const goToDashboard = () => {
    logButtonClick("View All Listings clicked", "/dashboard");
    navigate("/dashboard");
  };

  const emergencyReset = () => {
    logButtonClick("Emergency Reset UI clicked", "/");
    clearGlobalInteractionLocks("ListingSuccess emergency button");
    setTimeout(() => navigate("/"), 0);
  };

  // Verify with Stripe that the session was actually paid before showing success.
  useEffect(() => {
    if (verifyState !== "verifying" || !sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-listing-checkout", {
          body: { session_id: sessionId },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.paid) {
          setVerifyState("success");
        } else {
          console.warn("[ListingSuccess] Stripe verification failed", data);
          setVerifyState("failed");
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[ListingSuccess] Verification error:", err);
        setVerifyState("failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [verifyState, sessionId]);

  useEffect(() => {
    if (verifyState === "success" || verifyState === "failed" || listingCreated) {
      localStorage.removeItem("listingCheckoutPending");
    }
    if (verifyState === "failed") {
      // Don't keep stale pending listing data on failure
      localStorage.removeItem("pendingListing");
    }
  }, [verifyState, listingCreated]);

  // Give auth time to restore from Stripe redirect
  useEffect(() => {
    const timer = setTimeout(() => setHasWaited(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Defensive: clear any lingering body/root locks across the iOS deep-link handoff.
  useEffect(() => {
    console.log("[ListingSuccess] Route mounted", {
      pathname: window.location.pathname,
      search: window.location.search,
      paymentStatus,
      sessionId: sessionId ? "present" : "missing",
    });

    const cancelUnlock = scheduleGlobalInteractionUnlock("ListingSuccess mount");
    return () => {
      console.log("[ListingSuccess] Route unmounted");
      cancelUnlock();
    };
  }, []);

  useEffect(() => {
    console.log("[ListingSuccess] Loading/state snapshot", {
      authLoading: loading,
      hasWaited,
      verifyState,
      isCreatingListing,
      listingCreated,
      hasPendingListing: Boolean(localStorage.getItem("pendingListing")),
      checkoutPending: Boolean(localStorage.getItem("listingCheckoutPending")),
      successReady: verifyState === "success" && !isCreatingListing,
    });

    if (verifyState === "success" && !isCreatingListing) {
      console.log("[ListingSuccess] All blocking loading states cleared");
      scheduleGlobalInteractionUnlock("ListingSuccess success ready");
    }
  }, [loading, hasWaited, verifyState, isCreatingListing, listingCreated]);

  useEffect(() => {
    if (verifyState !== "success" || isCreatingListing) return;

    const cancelUnlock = scheduleGlobalInteractionUnlock("ListingSuccess stable success");
    const interval = window.setInterval(() => {
      const snapshot = getInteractionSnapshot();
      const hasGlobalLock =
        snapshot.bodyPointerEvents === "none" ||
        snapshot.htmlPointerEvents === "none" ||
        snapshot.rootPointerEvents === "none" ||
        snapshot.rootInert;

      if (hasGlobalLock) {
        console.warn("[ListingSuccess] Global interaction lock detected after success; clearing", snapshot);
        clearGlobalInteractionLocks("ListingSuccess recurring guard");
      }
      refreshDebugSnapshot("success guard", false);
    }, 500);

    return () => {
      cancelUnlock();
      window.clearInterval(interval);
    };
  }, [isCreatingListing, refreshDebugSnapshot, verifyState]);

  useEffect(() => {
    const logDocumentTap = (event: PointerEvent | TouchEvent) => {
      const point = getPointFromEvent(event);
      const target = describeEventTarget(event.target);
      const elementStack = document
        .elementsFromPoint(point.x, point.y)
        .slice(0, 8)
        .map((element) => describeEventTarget(element));
      const label = `${event.type} ${point.x},${point.y} ${target}`;
      setLastDocumentTap(label);
      console.log(`[ListingSuccess][TapDiagnostics] ${event.type}`, {
        target,
        point,
        elementStack,
        activeOverlayStates: activeOverlayStates(),
        ...getInteractionSnapshot(),
      });
      refreshDebugSnapshot(`document:${event.type}`, false);
    };

    window.addEventListener("pointerdown", logDocumentTap, { capture: true, passive: true });
    window.addEventListener("touchstart", logDocumentTap, { capture: true, passive: true });
    const interval = window.setInterval(() => refreshDebugSnapshot("poll", false), 1000);

    return () => {
      window.removeEventListener("pointerdown", logDocumentTap, { capture: true });
      window.removeEventListener("touchstart", logDocumentTap, { capture: true });
      window.clearInterval(interval);
    };
  }, [activeOverlayStates, refreshDebugSnapshot]);

  useEffect(() => {
    const overlayVisible = verifyState === "verifying" || (isCreatingListing && !listingCreated);
    if (overlayVisible && !overlayVisibleRef.current) {
      console.log("[ListingSuccess] Blocking overlay rendered", { verifyState, isCreatingListing, listingCreated });
    }
    if (!overlayVisible && overlayVisibleRef.current) {
      console.log("[ListingSuccess] Blocking overlay unmounted", { verifyState, isCreatingListing, listingCreated });
    }
    overlayVisibleRef.current = overlayVisible;
  }, [verifyState, isCreatingListing, listingCreated]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await supabase.auth.getSession();
      } catch (error) {
        console.error("[ListingSuccess] Error restoring session:", error);
      }
    };
    restoreSession();
  }, []);

  useEffect(() => {
    if (user) checkSubscription();
  }, [checkSubscription, user]);

  // Only create the listing AFTER Stripe verification succeeds
  useEffect(() => {
    const createPendingListing = async () => {
      if (verifyState !== "success") return;
      if (!user || creationStartedRef.current || listingCreated) return;

      const pendingListingData = localStorage.getItem("pendingListing");
      if (!pendingListingData) return;

      creationStartedRef.current = true;
      setIsCreatingListing(true);

      try {
        const listing = JSON.parse(pendingListingData);
        const uploadedImageUrls: string[] = listing.imageUrls || [];

        const { data, error } = await supabase
          .from('listings' as any)
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
            weekly_price: listing.weeklyPrice ? parseInt(listing.weeklyPrice) : null,
            monthly_price: listing.monthlyPrice ? parseInt(listing.monthlyPrice) : null,
            description: listing.description || null,
            images: uploadedImageUrls,
            delivery_available: listing.deliveryAvailable || false,
            approval_status: 'pending',
          })
          .select('id')
          .single();

        if (error) {
          console.error("Error creating listing:", error);
        } else {
          const listingData = data as any;
          if (listingData?.id) {
            setNewListingId(listingData.id);
            if (listing.licensePlate?.trim()) {
              const { error: sensitiveError } = await supabase
                .from('listing_sensitive_data' as any)
                .insert({
                  listing_id: listingData.id,
                  license_plate: listing.licensePlate.trim().toUpperCase(),
                  state: listing.state,
                });
              if (sensitiveError) console.error("Error saving sensitive data:", sensitiveError);
            }
          }

          localStorage.removeItem("listingCheckoutPending");
          localStorage.removeItem("pendingListing");
          setListingCreated(true);

          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, full_name")
            .eq("user_id", user.id)
            .single();

          const submitterName = profile?.first_name || profile?.full_name || "A user";
          const listingTitle = `${listing.year} ${listing.make} ${listing.model}`;

          sendNotificationEmail("admin_new_listing", null, {
            listingTitle,
            submitterName,
          }).catch(err => console.error("Failed to send admin notification:", err));

          toast({
            title: "🚗 Listing Created!",
            description: "Your vehicle has been submitted for approval.",
          });
        }
      } catch (error) {
        console.error("Error processing pending listing:", error);
      } finally {
        setIsCreatingListing(false);
      }
    };

    if (user && hasWaited && verifyState === "success") {
      createPendingListing();
    }
  }, [user, hasWaited, listingCreated, verifyState, toast]);

  // Keep trying to restore session
  useEffect(() => {
    if (!loading && hasWaited && !user) {
      const retryInterval = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) clearInterval(retryInterval);
      }, 3000);
      return () => clearInterval(retryInterval);
    }
  }, [user, loading, hasWaited]);

  const DebugPanel = () => (
    <div className="fixed left-2 right-2 top-[calc(env(safe-area-inset-top,0px)+4.75rem)] z-[2147483646] max-h-[38vh] overflow-y-auto rounded-lg border border-border bg-background/95 p-3 text-left text-[11px] leading-tight text-foreground shadow-lg backdrop-blur sm:left-auto sm:right-4 sm:w-[26rem]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong className="text-primary">ListingSuccess iOS Debug</strong>
        <button type="button" className="rounded border border-border px-2 py-1 text-[10px]" onClick={() => refreshDebugSnapshot("manual refresh")}>Refresh</button>
      </div>
      <div>route: {debugSnapshot.route}</div>
      <div>payment: {paymentStatus ?? "missing"}</div>
      <div>detected: {detectedBlocker}</div>
      <div>body.pe: {debugSnapshot.bodyPointerEvents}</div>
      <div>html.pe: {debugSnapshot.htmlPointerEvents}</div>
      <div>root.pe: {debugSnapshot.rootPointerEvents}</div>
      <div>body.overflow: {debugSnapshot.bodyOverflow}</div>
      <div>html.overflow: {debugSnapshot.htmlOverflow}</div>
      <div>body.touchAction: {debugSnapshot.bodyTouchAction}</div>
      <div>root.inert: {String(debugSnapshot.rootInert)}</div>
      <div>states: {activeOverlayStates().join(" | ")}</div>
      <div>last doc tap: {lastDocumentTap}</div>
      <div>last button: {lastButtonClick}</div>
      <div className="mt-1">element stack: {debugSnapshot.elementStack.join(" > ") || "none"}</div>
      <div className="mt-1">active overlays:</div>
      <ul className="list-disc pl-4">
        {debugSnapshot.activeOverlays.length > 0 ? (
          debugSnapshot.activeOverlays.slice(0, 6).map((overlay, index) => <li key={`${overlay}-${index}`}>{overlay}</li>)
        ) : (
          <li>none</li>
        )}
      </ul>
    </div>
  );

  const EmergencyResetButton = () => (
    <button
      type="button"
      onClick={emergencyReset}
      onPointerDown={() => console.log("[ListingSuccess] Emergency Reset UI pointerdown")}
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] left-1/2 z-[2147483647] -translate-x-1/2 rounded-full border border-border bg-destructive px-5 py-3 text-sm font-bold text-destructive-foreground shadow-lg"
    >
      Reset UI
    </button>
  );

  // Verifying with Stripe
  if (verifyState === "verifying") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <DebugPanel />
        <EmergencyResetButton />
        <LoadingSpinner />
        <p className="text-muted-foreground animate-pulse">Confirming your payment...</p>
      </div>
    );
  }

  // Show full-screen overlay only while listing is actively being created.
  // Once creation completes (success or error), fall through so buttons work.
  if (isCreatingListing && !listingCreated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <DebugPanel />
        <EmergencyResetButton />
        <LoadingSpinner />
        <p className="text-muted-foreground animate-pulse">Creating your listing...</p>
      </div>
    );
  }

  // Payment failed / canceled / unverified
  if (verifyState === "failed") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SEO title="Payment Issue | DiRent" description="Payment was not completed" />
        <Header />
        <DebugPanel />
        <EmergencyResetButton />
        <main className="container mx-auto px-4 py-8 pt-36 sm:pt-24">
          <div className="max-w-lg mx-auto">
            <Card className="border-destructive/20 bg-card/50 backdrop-blur">
              <CardContent className="pt-8 pb-8 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-destructive/10 p-4">
                    <XCircle className="h-16 w-16 text-destructive" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-foreground">
                    Payment Not Completed
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Your payment was not completed. Please try again.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={() => {
                      logButtonClick("Back to Listing clicked", "/create-listing");
                      navigate("/create-listing");
                    }}
                    className="flex-1 gap-2"
                  >
                    <Car className="h-4 w-4" />
                    Back to Listing
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      logButtonClick("Browse Cars clicked", "/dashboard");
                      navigate("/dashboard");
                    }}
                    className="flex-1"
                  >
                    Browse Cars
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Success! | DiRent" description="Your subscription is active" />
      <Header />
      <DebugPanel />
      <EmergencyResetButton />

      <main className="container mx-auto px-4 py-8 pt-36 sm:pt-24">
        <div className="max-w-lg mx-auto">
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardContent className="pt-8 pb-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <CheckCircle className="h-16 w-16 text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">
                  🎉 Congratulations, your listing has been submitted for review!
                </h1>
                <p className="text-lg text-muted-foreground">
                  Your 30-day free trial has started. Your listing will be reviewed by our team and should go live within 24 hours. You'll receive an email notification once it's approved.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={goToListing}
                  className="flex-1 gap-2"
                >
                  <Car className="h-4 w-4" />
                  See My Listing
                </Button>
                <Button
                  variant="outline"
                  onClick={goToCreateListing}
                  className="flex-1 gap-2"
                >
                  <Car className="h-4 w-4" />
                  Create New Listing
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={goToDashboard}
                className="text-muted-foreground"
              >
                View All Listings
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ListingSuccess;
