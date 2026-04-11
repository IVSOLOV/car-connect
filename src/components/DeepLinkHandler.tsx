import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

const DeepLinkHandler = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppUrlOpen = (event: { url: string }) => {
      console.log("[DeepLink] Received URL:", event.url);
      try {
        // Parse custom scheme URL: com.solostar.dirent://listing-success?payment=success
        const url = new URL(event.url);
        const path = url.hostname + url.pathname; // "listing-success" or "listing-success/"
        const search = url.search; // "?payment=success"
        
        const cleanPath = "/" + path.replace(/\/$/, "");
        console.log("[DeepLink] Navigating to:", cleanPath + search);
        navigate(cleanPath + search, { replace: true });
      } catch (err) {
        console.error("[DeepLink] Failed to parse URL:", err);
      }
    };

    App.addListener("appUrlOpen", handleAppUrlOpen);

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);

  return null;
};

export default DeepLinkHandler;
