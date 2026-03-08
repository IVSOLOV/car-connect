import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PushNotificationRequest {
  recipientUserId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

// Get OAuth2 access token from service account
async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  // Create JWT header and claim set
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  // Base64url encode
  const encoder = new TextEncoder();
  const b64url = (data: Uint8Array) =>
    btoa(String.fromCharCode(...data))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = b64url(encoder.encode(JSON.stringify(header)));
  const claimB64 = b64url(encoder.encode(JSON.stringify(claimSet)));
  const signInput = `${headerB64}.${claimB64}`;

  // Import private key and sign
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signInput)
  );

  const signatureB64 = b64url(new Uint8Array(signature));
  const jwt = `${signInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error("OAuth2 token error:", errorText);
    throw new Error(`Failed to get access token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-push-notification function called (FCM v1)");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Firebase project ID from service account
    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountJson) {
      console.error("FIREBASE_SERVICE_ACCOUNT is not configured");
      return new Response(
        JSON.stringify({ error: "Push notification service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { recipientUserId, title, body, data }: PushNotificationRequest = await req.json();
    console.log("Push notification request:", { recipientUserId, title });

    if (!recipientUserId) {
      return new Response(
        JSON.stringify({ error: "recipientUserId is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get all device tokens for the recipient
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, id")
      .eq("user_id", recipientUserId);

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch device tokens" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("No push tokens found for user:", recipientUserId);
      return new Response(
        JSON.stringify({ success: true, message: "No devices registered" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get OAuth2 access token
    const accessToken = await getAccessToken();
    console.log(`Sending push to ${tokens.length} device(s) via FCM v1 API`);

    const results = [];
    const invalidTokenIds: string[] = [];

    // FCM v1 API sends to one token at a time
    for (const tokenRecord of tokens) {
      try {
        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token: tokenRecord.token,
                notification: {
                  title,
                  body,
                },
                apns: {
                  headers: {
                    "apns-priority": "10",
                  },
                  payload: {
                    aps: {
                      sound: "default",
                      badge: 1,
                      "content-available": 1,
                    },
                  },
                },
                android: {
                  priority: "high",
                  notification: {
                    sound: "default",
                  },
                },
                data: data || {},
              },
            }),
          }
        );

        const fcmResult = await fcmResponse.json();

        if (!fcmResponse.ok) {
          console.error("FCM v1 error for token:", tokenRecord.token.substring(0, 20) + "...", fcmResult);
          
          // Check for invalid/unregistered token errors
          const errorCode = fcmResult?.error?.details?.[0]?.errorCode || fcmResult?.error?.code;
          const errorStatus = fcmResult?.error?.status;
          if (
            errorCode === "UNREGISTERED" ||
            errorCode === "INVALID_ARGUMENT" ||
            errorStatus === "NOT_FOUND"
          ) {
            invalidTokenIds.push(tokenRecord.id);
          }
        } else {
          console.log("FCM v1 success:", fcmResult);
        }

        results.push(fcmResult);
      } catch (err) {
        console.error("Error sending to token:", err);
        results.push({ error: err.message });
      }
    }

    // Clean up invalid tokens
    if (invalidTokenIds.length > 0) {
      console.log("Removing invalid tokens:", invalidTokenIds.length);
      for (const id of invalidTokenIds) {
        await supabase.from("push_tokens").delete().eq("id", id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
