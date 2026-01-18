import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  type: "confirmation" | "recovery" | "magic_link" | "invite";
  email: string;
  token_hash?: string;
  redirect_to?: string;
  confirmation_url?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-auth-email function called");

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
    const { type, email, confirmation_url }: AuthEmailRequest = await req.json();
    console.log("Auth email request:", { type, email, hasConfirmationUrl: !!confirmation_url });

    let subject = "";
    let htmlContent = "";

    switch (type) {
      case "confirmation":
        subject = "Welcome to DiRent - Verify Your Email 🚗";
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Welcome to DiRent! 🚗</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin: 0 0 16px 0;">
                Thanks for joining <strong style="color: #1a1a1a;">DiRent</strong> — the trusted marketplace for vehicle rentals!
              </p>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
                To get started, please verify your email address (${email}) by clicking the button below:
              </p>
              <a href="${confirmation_url}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 500; font-size: 16px;">
                Verify Email & Get Started
              </a>
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5;">
                <p style="color: #4a4a4a; font-size: 14px; line-height: 1.5; margin: 0 0 12px 0;">
                  <strong>What's next?</strong>
                </p>
                <ul style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Browse available vehicles in your area</li>
                  <li>Message owners directly</li>
                  <li>Become a host and list your own vehicles</li>
                </ul>
              </div>
              <p style="color: #888888; font-size: 13px; line-height: 1.5; margin: 32px 0 0 0;">
                If you didn't create an account with DiRent, you can safely ignore this email.
              </p>
            </div>
          </div>
        `;
        break;

      case "recovery":
        subject = "Reset your DiRent password";
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Reset your password</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
                We received a request to reset the password for your DiRent account (${email}).
              </p>
              <a href="${confirmation_url}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 500; font-size: 16px;">
                Reset Password
              </a>
              <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 32px 0 0 0;">
                If you didn't request a password reset, you can safely ignore this email. This link will expire in 24 hours.
              </p>
            </div>
          </div>
        `;
        break;

      case "magic_link":
        subject = "Your DiRent login link";
        htmlContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; background-color: #f5f5f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
              <h1 style="color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">Your login link</h1>
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin: 0 0 24px 0;">
                Click the button below to sign in to your DiRent account.
              </p>
              <a href="${confirmation_url}" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 500; font-size: 16px;">
                Sign In to DiRent
              </a>
              <p style="color: #888888; font-size: 14px; line-height: 1.5; margin: 32px 0 0 0;">
                If you didn't request this link, you can safely ignore this email.
              </p>
            </div>
          </div>
        `;
        break;

      default:
        console.error("Unknown auth email type:", type);
        return new Response(
          JSON.stringify({ error: "Unknown email type" }),
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
        from: "DiRent <noreply@dirrental.com>",
        to: [email],
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

    console.log("Auth email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
