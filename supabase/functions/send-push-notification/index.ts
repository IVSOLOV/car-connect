import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

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

const handler = async (req: Request): Promise<Response> => {
  console.log("send-push-notification function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!FCM_SERVER_KEY) {
    console.error("FCM_SERVER_KEY is not configured");
    return new Response(
      JSON.stringify({ error: "Push notification service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
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
      .select("token")
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

    const registrationIds = tokens.map((t: any) => t.token);
    console.log(`Sending push to ${registrationIds.length} device(s)`);

    // Send via FCM Legacy HTTP API
    const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        registration_ids: registrationIds,
        notification: {
          title,
          body,
          sound: "default",
          badge: 1,
        },
        data: data || {},
        priority: "high",
        content_available: true,
      }),
    });

    const fcmResult = await fcmResponse.json();
    console.log("FCM response:", fcmResult);

    // Clean up invalid tokens
    if (fcmResult.results) {
      const invalidTokenIndices: number[] = [];
      fcmResult.results.forEach((result: any, index: number) => {
        if (result.error === "InvalidRegistration" || result.error === "NotRegistered") {
          invalidTokenIndices.push(index);
        }
      });

      if (invalidTokenIndices.length > 0) {
        const invalidTokens = invalidTokenIndices.map(i => registrationIds[i]);
        console.log("Removing invalid tokens:", invalidTokens);
        for (const invalidToken of invalidTokens) {
          await supabase
            .from("push_tokens")
            .delete()
            .eq("token", invalidToken);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, fcmResult }),
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
