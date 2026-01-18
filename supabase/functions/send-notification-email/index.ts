import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  type: "message" | "ticket_response" | "listing_approved" | "listing_rejected" | "admin_new_listing" | "admin_new_ticket" | "welcome";
  recipientUserId?: string;
  recipientEmail?: string;
  recipientName?: string;
  data: {
    senderName?: string;
    listingTitle?: string;
    messagePreview?: string;
    ticketSubject?: string;
    adminNotes?: string;
    rejectionReason?: string;
    submitterName?: string;
    ticketDescription?: string;
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

    const { type, recipientUserId, recipientEmail, recipientName, data }: NotificationEmailRequest = await req.json();
    console.log("Notification request:", { type, recipientUserId, recipientEmail, data });

    const baseUrl = "https://directrental.lovable.app";
    
    // Handle welcome email (doesn't require recipientUserId since user just signed up)
    if (type === "welcome" && recipientEmail) {
      const userName = recipientName || "there";
      const subject = "Welcome to DiRent! 🚗";
      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Welcome to DiRent, ${userName}! 🎉</h2>
          <p style="color: #666; font-size: 16px;">Thank you for joining our community!</p>
          
          <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
            <h3 style="color: #7c3aed; margin-top: 0;">Important: What is DiRent?</h3>
            <p style="color: #444; font-size: 15px; margin-bottom: 10px;">
              <strong>DiRent is NOT a car rental company.</strong> We are a <strong>peer-to-peer marketplace platform</strong> that connects car owners (hosts) directly with renters (guests).
            </p>
            <p style="color: #444; font-size: 15px;">
              This means:
            </p>
            <ul style="color: #444; font-size: 15px; padding-left: 20px;">
              <li>All vehicles are listed by private owners or businesses</li>
              <li>Rental terms and conditions are set by each host</li>
              <li>You communicate directly with car owners</li>
              <li>DiRent facilitates the connection but is not a party to rental agreements</li>
            </ul>
          </div>
          
          <h3 style="color: #333;">What can you do on DiRent?</h3>
          <ul style="color: #666; font-size: 15px; padding-left: 20px;">
            <li><strong>Browse vehicles</strong> - Find cars, trucks, and vans available for rent in your area</li>
            <li><strong>Message owners</strong> - Contact hosts directly to ask questions or arrange rentals</li>
            <li><strong>List your vehicle</strong> - Have a car? Become a host and earn money by renting it out</li>
          </ul>
          
          <a href="${baseUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px;">Start Exploring</a>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            If you have any questions, don't hesitate to reach out through our support system.<br><br>
            Best regards,<br>The DiRent Team
          </p>
        </div>
      `;

      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "DiRent <notifications@dirrental.com>",
          to: [recipientEmail],
          subject,
          html: htmlContent,
        }),
      });

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        console.warn("Welcome email error (non-blocking):", emailResult);
        return new Response(
          JSON.stringify({ success: true, emailSkipped: true, reason: emailResult.message }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Welcome email sent successfully:", emailResult);
      return new Response(JSON.stringify({ success: true, emailResult }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    // For admin notifications, get all admin emails
    if (type === "admin_new_listing" || type === "admin_new_ticket") {
      // Get all admin user IDs
      const { data: adminRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (rolesError) {
        console.error("Failed to get admin roles:", rolesError);
        return new Response(
          JSON.stringify({ error: "Failed to get admin users" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (!adminRoles || adminRoles.length === 0) {
        console.log("No admin users found");
        return new Response(
          JSON.stringify({ success: true, message: "No admin users to notify" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get emails for all admins
      const adminEmails: string[] = [];
      for (const adminRole of adminRoles) {
        const { data: userData } = await supabase.auth.admin.getUserById(adminRole.user_id);
        if (userData?.user?.email) {
          adminEmails.push(userData.user.email);
        }
      }

      if (adminEmails.length === 0) {
        console.log("No admin emails found");
        return new Response(
          JSON.stringify({ success: true, message: "No admin emails found" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      let subject = "";
      let htmlContent = "";

      if (type === "admin_new_listing") {
        subject = `🚗 New Listing Pending Approval - ${data.listingTitle}`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">📋 New Listing Submitted</h2>
            <p style="color: #666; font-size: 16px;">A new listing has been submitted and is waiting for your review.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #444;"><strong>Vehicle:</strong> ${data.listingTitle}</p>
              <p style="margin: 0; color: #444;"><strong>Submitted by:</strong> ${data.submitterName || "A user"}</p>
            </div>
            <a href="${baseUrl}/approval-requests" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">Review Listings</a>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">- DiRent Admin System</p>
          </div>
        `;
      } else if (type === "admin_new_ticket") {
        subject = `🎫 New Support Ticket - ${data.ticketSubject}`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">🎫 New Support Ticket</h2>
            <p style="color: #666; font-size: 16px;">A user has submitted a new support ticket.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; color: #444;"><strong>Subject:</strong> ${data.ticketSubject}</p>
              <p style="margin: 0 0 10px 0; color: #444;"><strong>From:</strong> ${data.submitterName || "A user"}</p>
              ${data.ticketDescription ? `<p style="margin: 0; color: #666; font-style: italic;">"${data.ticketDescription.substring(0, 200)}${data.ticketDescription.length > 200 ? '...' : ''}"</p>` : ''}
            </div>
            <a href="${baseUrl}/admin" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">View Tickets</a>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">- DiRent Admin System</p>
          </div>
        `;
      }

      // Send email to all admins
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "DiRent <notifications@dirrental.com>",
          to: adminEmails,
          subject,
          html: htmlContent,
        }),
      });

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        // Log the error but don't fail - email is non-critical
        console.warn("Resend API error (non-blocking):", emailResult);
        return new Response(
          JSON.stringify({ success: true, emailSkipped: true, reason: emailResult.message }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Admin notification email sent successfully:", emailResult);

      return new Response(JSON.stringify({ success: true, emailResult }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Regular user notifications require recipientUserId
    if (!recipientUserId) {
      return new Response(
        JSON.stringify({ error: "recipientUserId required for user notifications" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get recipient's email from auth.users
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(recipientUserId);
    
    if (userError || !userData?.user?.email) {
      console.error("Failed to get user email:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to get recipient email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userEmail = userData.user.email;
    console.log("Sending email to:", userEmail);

    // Get recipient's name from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, full_name")
      .eq("user_id", recipientUserId)
      .single();

    const userName = profile?.first_name || profile?.full_name || "there";

    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "message":
        subject = `New message from ${data.senderName || "someone"} on DiRent`;
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Hi ${userName}!</h2>
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
            <h2 style="color: #333;">Hi ${userName}!</h2>
            <p style="color: #666; font-size: 16px;">Your support ticket "${data.ticketSubject || "Support Request"}" has received a response from our team.</p>
            ${data.adminNotes ? `<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;"><p style="margin: 0; color: #166534;">${data.adminNotes}</p></div>` : ""}
            <a href="${baseUrl}/my-issues" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">View Ticket</a>
            <p style="color: #999; font-size: 14px; margin-top: 30px;">Best regards,<br>The DiRent Team</p>
          </div>
        `;
        break;

      case "listing_approved":
        subject = "Your listing has been approved! - DiRent";
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">🎉 Great news, ${userName}!</h2>
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
            <h2 style="color: #333;">Hi ${userName},</h2>
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
        from: "DiRent <notifications@dirrental.com>",
        to: [userEmail],
        subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      // Log the error but don't fail - email is non-critical
      console.warn("Resend API error (non-blocking):", emailResult);
      return new Response(
        JSON.stringify({ success: true, emailSkipped: true, reason: emailResult.message }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
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
