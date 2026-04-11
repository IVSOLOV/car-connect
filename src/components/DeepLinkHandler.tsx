import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const navigateFromUrl = (incomingUrl: string) => {
      console.log("[DeepLink] Received URL:", incomingUrl);

      try {
        const url = new URL(incomingUrl);
        const routePath = url.hostname
          ? `/${`${url.hostname}${url.pathname}`.replace(/^\/+/, "").replace(/\/$/, "")}`
          : url.pathname.replace(/\/$/, "") || "/";
        const destination = `${routePath}${url.search}`;

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
