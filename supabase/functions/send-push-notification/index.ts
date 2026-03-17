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
  newestOnly?: boolean;
  targetToken?: string;
  debug?: boolean;
}

interface FirebaseServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

interface PushTokenRecord {
  id: string;
  user_id: string;
  platform: string;
  token: string;
  created_at: string;
  updated_at: string;
}

type TokenKind = "fcm" | "apns" | "unknown";

const jsonHeaders = { "Content-Type": "application/json", ...corsHeaders };

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const parseJsonSafe = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const getServiceAccount = (): FirebaseServiceAccount => {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  }

  return JSON.parse(serviceAccountJson) as FirebaseServiceAccount;
};

const classifyToken = (token: string): TokenKind => {
  if (/^[A-Fa-f0-9]{64,}$/.test(token)) {
    return "apns";
  }

  if (token.includes(":")) {
    return "fcm";
  }

  return "unknown";
};

const buildMessagePayload = ({
  token,
  title,
  body,
  data,
}: {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) => ({
  message: {
    token,
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
          alert: {
            title,
            body,
          },
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
});

async function getAccessToken(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const b64url = (data: Uint8Array) =>
    btoa(String.fromCharCode(...data))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  const headerB64 = b64url(encoder.encode(JSON.stringify(header)));
  const claimB64 = b64url(encoder.encode(JSON.stringify(claimSet)));
  const signInput = `${headerB64}.${claimB64}`;

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

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await parseJsonSafe(tokenResponse);

  if (!tokenResponse.ok || !tokenData?.access_token) {
    console.error("OAuth2 token error:", tokenData);
    throw new Error(`Failed to get access token: ${tokenResponse.status}`);
  }

  return tokenData.access_token as string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-push-notification function called (FCM v1)");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccount = getServiceAccount();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      recipientUserId,
      title,
      body,
      data,
      newestOnly = false,
      targetToken,
      debug = false,
    }: PushNotificationRequest = await req.json();

    console.log("Push notification request:", {
      recipientUserId,
      title,
      newestOnly,
      targetTokenProvided: Boolean(targetToken),
      debug,
    });

    if (!recipientUserId) {
      return new Response(JSON.stringify({ error: "recipientUserId is required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("id, user_id, platform, token, created_at, updated_at")
      .eq("user_id", recipientUserId)
      .order("updated_at", { ascending: false });

    if (tokensError) {
      console.error("Error fetching push tokens:", tokensError);
      return new Response(JSON.stringify({ error: "Failed to fetch device tokens" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const typedTokens = (tokens ?? []) as PushTokenRecord[];

    if (typedTokens.length === 0) {
      console.log("No push tokens found for user:", recipientUserId);
      return new Response(JSON.stringify({ success: true, message: "No devices registered" }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const selectedTokens = typedTokens
      .filter((tokenRecord) => !targetToken || tokenRecord.token === targetToken)
      .filter((tokenRecord) => classifyToken(tokenRecord.token) === "fcm");

    const tokensToSend = newestOnly ? selectedTokens.slice(0, 1) : selectedTokens;

    if (tokensToSend.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No FCM tokens available for this send request",
          availableTokens: typedTokens.map((tokenRecord) => ({
            id: tokenRecord.id,
            platform: tokenRecord.platform,
            tokenKind: classifyToken(tokenRecord.token),
            token: tokenRecord.token,
            created_at: tokenRecord.created_at,
            updated_at: tokenRecord.updated_at,
          })),
        }),
        {
          status: 400,
          headers: jsonHeaders,
        }
      );
    }

    const accessToken = await getAccessToken(serviceAccount);
    const invalidTokenIds: string[] = [];
    const attempts: Array<Record<string, unknown>> = [];

    for (const tokenRecord of tokensToSend) {
      const payload = buildMessagePayload({
        token: tokenRecord.token,
        title,
        body,
        data,
      });

      console.log("Push payload being sent:", JSON.stringify({
        tokenId: tokenRecord.id,
        platform: tokenRecord.platform,
        tokenKind: classifyToken(tokenRecord.token),
        payload,
      }));

      try {
        const fcmResponse = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
          }
        );

        const fcmResult = await parseJsonSafe(fcmResponse);
        const errorCode =
          (fcmResult as any)?.error?.details?.[0]?.errorCode ||
          (fcmResult as any)?.error?.code;
        const errorStatus = (fcmResult as any)?.error?.status;
        const shouldDeleteInvalidToken =
          errorCode === "UNREGISTERED" ||
          errorCode === "INVALID_ARGUMENT" ||
          errorStatus === "NOT_FOUND";

        if (shouldDeleteInvalidToken) {
          invalidTokenIds.push(tokenRecord.id);
        }

        console.log("Push send response:", JSON.stringify({
          tokenId: tokenRecord.id,
          status: fcmResponse.status,
          ok: fcmResponse.ok,
          body: fcmResult,
        }));

        attempts.push({
          tokenId: tokenRecord.id,
          platform: tokenRecord.platform,
          token: tokenRecord.token,
          tokenKind: classifyToken(tokenRecord.token),
          updatedAt: tokenRecord.updated_at,
          createdAt: tokenRecord.created_at,
          deliveryMode: "visible-notification",
          includesVisibleNotification:
            Boolean(payload.message.notification.title) || Boolean(payload.message.notification.body),
          includesDataPayload: Object.keys(payload.message.data ?? {}).length > 0,
          includesSilentBackgroundFlag:
            Boolean((payload.message.apns?.payload as { aps?: { [key: string]: unknown } })?.aps?.["content-available"]),
          payload: debug ? payload : undefined,
          responseStatus: fcmResponse.status,
          responseOk: fcmResponse.ok,
          responseBody: fcmResult,
          removedAsInvalid: shouldDeleteInvalidToken,
        });
      } catch (error) {
        attempts.push({
          tokenId: tokenRecord.id,
          platform: tokenRecord.platform,
          token: tokenRecord.token,
          tokenKind: classifyToken(tokenRecord.token),
          updatedAt: tokenRecord.updated_at,
          createdAt: tokenRecord.created_at,
          deliveryMode: "visible-notification",
          includesVisibleNotification: true,
          includesDataPayload: Object.keys(data ?? {}).length > 0,
          includesSilentBackgroundFlag: true,
          payload: debug ? payload : undefined,
          responseStatus: null,
          responseOk: false,
          responseBody: { error: toErrorMessage(error) },
          removedAsInvalid: false,
        });
      }
    }

    if (invalidTokenIds.length > 0) {
      for (const id of invalidTokenIds) {
        await supabase.from("push_tokens").delete().eq("id", id);
      }
    }

    return new Response(
      JSON.stringify({
        success: attempts.some((attempt) => Boolean(attempt.responseOk)),
        sentVia: "firebase-fcm-v1",
        selectedTokenStrategy: targetToken ? "target-token" : newestOnly ? "newest-fcm-token-only" : "all-fcm-tokens",
        availableTokens: typedTokens.map((tokenRecord) => ({
          id: tokenRecord.id,
          platform: tokenRecord.platform,
          token: tokenRecord.token,
          tokenKind: classifyToken(tokenRecord.token),
          created_at: tokenRecord.created_at,
          updated_at: tokenRecord.updated_at,
        })),
        attempts,
      }),
      {
        status: 200,
        headers: jsonHeaders,
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(JSON.stringify({ error: toErrorMessage(error) }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

serve(handler);