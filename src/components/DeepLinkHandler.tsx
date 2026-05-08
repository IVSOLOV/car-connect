import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { scheduleGlobalInteractionUnlock } from "@/lib/interactionReset";

const MANUAL_EXIT_UNTIL_KEY = "listing_success_manual_exit_until";

const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      console.log("[DeepLink] Exit path: not running on native platform");
      return;
    }

    let lastHandledUrl: string | null = null;
    let lastHandledAt = 0;

    const navigateFromUrl = (incomingUrl: string) => {
      console.log("[DeepLink] Received URL:", incomingUrl);

      // Dedupe duplicate iOS deep-link events (getLaunchUrl + appUrlOpen can both fire,
      // and iOS sometimes re-delivers the same URL within a short window). Without
      // deduping, ListingSuccess remounts repeatedly and can leave overlay state stuck.
      const now = Date.now();
      if (incomingUrl === lastHandledUrl && now - lastHandledAt < 2000) {
        console.log("[DeepLink] Exit path: ignoring duplicate URL within debounce window");
        return;
      }
      lastHandledUrl = incomingUrl;
      lastHandledAt = now;

      try {
        const url = new URL(incomingUrl);
        const routePath = url.hostname
          ? `/${`${url.hostname}${url.pathname}`.replace(/^\/+/, "").replace(/\/$/, "")}`
          : url.pathname.replace(/\/$/, "") || "/";
        const destination = `${routePath}${url.search}`;

        if (routePath === "/listing-success" || url.pathname.replace(/\/$/, "") === "/listing-success") {
          const manualExitUntil = Number(localStorage.getItem(MANUAL_EXIT_UNTIL_KEY) || "0");
          if (manualExitUntil > Date.now()) {
            console.log("[DeepLink] Exit path: listing-success ignored because manual navigation to /my-listings is active", {
              destination,
              currentPath: window.location.pathname,
            });
            return;
          }
        }

        // Defensive: clear any leftover body/root locks across the native handoff.
        scheduleGlobalInteractionUnlock("DeepLink before navigation");

        console.log("[DeepLink] Navigating to:", destination);
        navigate(destination, { replace: true });
        window.setTimeout(() => {
          console.log("[DeepLink] Navigation executed:", {
            destination,
            currentPath: window.location.pathname,
            currentSearch: window.location.search,
          });
          scheduleGlobalInteractionUnlock("DeepLink after navigation");
        }, 0);
      } catch (err) {
        console.error("[DeepLink] Failed to parse URL:", err);
      }
    };

    const handleAppUrlOpen = (event: { url: string }) => {
      navigateFromUrl(event.url);
    };

    let isActive = true;
    let urlOpenListener: { remove: () => Promise<void> } | undefined;

    App.getLaunchUrl()
      .then((launchData) => {
        if (!isActive) {
          console.log("[DeepLink] Exit path: launch URL ignored because handler inactive");
          return;
        }
        if (!launchData?.url) {
          console.log("[DeepLink] Exit path: no launch URL available");
          return;
        }
        navigateFromUrl(launchData.url);
      })
      .catch((error) => {
        console.error("[DeepLink] Failed to read launch URL:", error);
      });

    App.addListener("appUrlOpen", handleAppUrlOpen).then((listener) => {
      if (!isActive) {
        console.log("[DeepLink] Exit path: removing listener because handler inactive");
        void listener.remove();
        return;
      }

      urlOpenListener = listener;
    });

    return () => {
      isActive = false;
      console.log("[DeepLink] Exit path: cleanup removing URL listener");
      void urlOpenListener?.remove();
    };
  }, [navigate]);

  return null;
};

export default DeepLinkHandler;
