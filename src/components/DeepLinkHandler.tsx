import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let lastHandledUrl: string | null = null;
    let lastHandledAt = 0;

    const navigateFromUrl = (incomingUrl: string) => {
      console.log("[DeepLink] Received URL:", incomingUrl);

      // Dedupe duplicate iOS deep-link events (getLaunchUrl + appUrlOpen can both fire,
      // and iOS sometimes re-delivers the same URL within a short window). Without
      // deduping, ListingSuccess remounts repeatedly and can leave overlay state stuck.
      const now = Date.now();
      if (incomingUrl === lastHandledUrl && now - lastHandledAt < 2000) {
        console.log("[DeepLink] Ignoring duplicate URL within debounce window");
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

        // Defensive: clear any leftover body locks (e.g. fullscreen image viewer,
        // dialogs) so the destination page is always interactive after a deep link.
        try {
          document.body.style.overflow = "";
          document.body.style.pointerEvents = "";
          document.documentElement.style.overflow = "";
        } catch {
          /* ignore */
        }

        console.log("[DeepLink] Navigating to:", destination);
        navigate(destination, { replace: true });
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
        if (!isActive || !launchData?.url) return;
        navigateFromUrl(launchData.url);
      })
      .catch((error) => {
        console.error("[DeepLink] Failed to read launch URL:", error);
      });

    App.addListener("appUrlOpen", handleAppUrlOpen).then((listener) => {
      if (!isActive) {
        void listener.remove();
        return;
      }

      urlOpenListener = listener;
    });

    return () => {
      isActive = false;
      void urlOpenListener?.remove();
    };
  }, [navigate]);

  return null;
};

export default DeepLinkHandler;
