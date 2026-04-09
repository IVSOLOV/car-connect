import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const JSON_HEADERS = { ...corsHeaders, "Content-Type": "application/json" };

const timeoutFetch = async (input: string, init: RequestInit = {}, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseLocation = (data: any) => {
  const address = data?.address ?? {};
  return {
    city: address.city || address.town || address.village || address.county || "",
    state: address.state || "",
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const response = await timeoutFetch(
        reverseUrl,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "directrental-location-resolver/1.0",
          },
        },
        10000,
      );

      if (!response.ok) {
        throw new Error(`Reverse geocode failed with status ${response.status}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify({ ...parseLocation(data), source: "gps" }), { headers: JSON_HEADERS });
    }

    // Try multiple IP geolocation services for reliability
    let ipData: any = null;

    // Attempt 1: ip-api.com (no key needed, generous limits)
    try {
      const resp1 = await timeoutFetch("http://ip-api.com/json/?fields=city,regionName,status", {}, 7000);
      if (resp1.ok) {
        const d = await resp1.json();
        if (d.status === "success") {
          ipData = { city: d.city || "", state: d.regionName || "" };
        }
      }
    } catch (_) { /* try next */ }

    // Attempt 2: ipapi.co
    if (!ipData) {
      try {
        const ipUrl = clientIp ? `https://ipapi.co/${clientIp}/json/` : "https://ipapi.co/json/";
        const resp2 = await timeoutFetch(ipUrl, { headers: { "Accept": "application/json" } }, 7000);
        if (resp2.ok) {
          const d = await resp2.json();
          ipData = { city: d.city || "", state: d.region || "" };
        }
      } catch (_) { /* fallback failed */ }
    }

    if (!ipData) {
      throw new Error("All IP geolocation services failed");
    }

    return new Response(
      JSON.stringify({ city: ipData.city, state: ipData.state, source: "ip" }),
      { headers: JSON_HEADERS },
    );
  } catch (error) {
    console.error("resolve-location error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: JSON_HEADERS });
  }
});
