import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  type: "message" | "ticket_response" | "listing_approved" | "listing_rejected";
  recipientUserId: string;
  data: {
    senderName?: string;
    listingTitle?: string;
    messagePreview?: string;
    ticketSubject?: string;
    adminNotes?: string;
    rejectionReason?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-notification-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, recipientUserId, data }: NotificationEmailRequest = await req.json();
    console.log("Notification request:", { type, recipientUserId, data });

    // Get recipient's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipientUserId);
    
    if (userError || !userData?.user?.email) {
      console.error("Failed to get user email:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to get recipient email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const recipientEmail = userData.user.email;
    console.log("Sending email to:", recipientEmail);

    // Get recipient's name from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, full_name")
      .eq("user_id", recipientUserId)
      .single();

    const recipientName = profile?.first_name || profile?.full_name || "there";

    let subject = "";
    let htmlContent = "";
    const baseUrl = "https://fhaukvjpthkftfxfmnhm.lovableproject.com";

    switch (type) {
      case "message":
        subject = `New message from ${data.senderName || "someone"} on DiRent`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Hi ${recipientName}!</h2>
            <p style="color: #666; font-size: 16px;">You have a new message from <strong>${data.senderName || "a user"}</strong>${data.listingTitle ? ` about <strong>${data.listingTitle}</strong>` : ""}.</p>
            ${data.messagePreview ? `<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0; color: #444; font-style: italic;">"${data.messagePreview}"</p></div>` : ""}
            <a href="${baseUrl}/messages" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">View Message</a>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">Best regards,<br>The DiRent Team</p>
          </div>
        `;
        break;

      case "ticket_response":
        subject = "Your support ticket has been updated - DiRent";
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Hi ${recipientName}!</h2>
            <p style="color: #666; font-size: 16px;">Your support ticket "${data.ticketSubject || "Support Request"}" has received a response from our team.</p>
            ${data.adminNotes ? `<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;"><p style="margin: 0; color: #166534;">${data.adminNotes}</p></div>` : ""}
            <a href="${baseUrl}/support-tickets" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">View Ticket</a>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">Best regards,<br>The DiRent Team</p>
          </div>
        `;
        break;

      case "listing_approved":
        subject = "Your listing has been approved! - DiRent";
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">🎉 Great news, ${recipientName}!</h2>
            <p style="color: #666; font-size: 16px;">Your listing <strong>"${data.listingTitle}"</strong> has been approved and is now live on DiRent!</p>
            <p style="color: #666; font-size: 16px;">Potential renters can now discover and inquire about your car.</p>
            <a href="${baseUrl}/dashboard" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">View Your Dashboard</a>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">Best regards,<br>The DiRent Team</p>
          </div>
        `;
        break;

      case "listing_rejected":
        subject = "Update on your listing submission - DiRent";
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Hi ${recipientName},</h2>
            <p style="color: #666; font-size: 16px;">We've reviewed your listing <strong>"${data.listingTitle}"</strong> and unfortunately, we couldn't approve it at this time.</p>
            ${data.rejectionReason ? `<div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;"><p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${data.rejectionReason}</p></div>` : ""}
            <p style="color: #666; font-size: 16px;">Please update your listing based on the feedback and resubmit for approval.</p>
            <a href="${baseUrl}/dashboard" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">Edit Listing</a>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">Best regards,<br>The DiRent Team</p>
          </div>
        `;
        break;

      default:
        console.error("Unknown notification type:", type);
        return new Response(
          JSON.stringify({ error: "Unknown notification type" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }

    // Send email using Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DiRent <notifications@resend.dev>",
        to: [recipientEmail],
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      return new Response(
        JSON.stringify({ error: emailResult.message || "Failed to send email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
