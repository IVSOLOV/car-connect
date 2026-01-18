import { supabase } from "@/integrations/supabase/client";

type NotificationType = "message" | "ticket_response" | "listing_approved" | "listing_rejected" | "admin_new_listing" | "admin_new_ticket" | "welcome";

interface NotificationData {
  senderName?: string;
  listingTitle?: string;
  messagePreview?: string;
  ticketSubject?: string;
  adminNotes?: string;
  rejectionReason?: string;
  submitterName?: string;
  ticketDescription?: string;
}

export const sendNotificationEmail = async (
  type: NotificationType,
  recipientUserId: string | null,
  data: NotificationData
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data: response, error } = await supabase.functions.invoke("send-notification-email", {
      body: {
        type,
        recipientUserId,
        data,
      },
    });

    if (error) {
      console.error("Error sending notification email:", error);
      return { success: false, error: error.message };
    }

    console.log("Notification email sent:", response);
    return { success: true };
  } catch (err: any) {
    console.error("Error invoking notification function:", err);
    return { success: false, error: err.message };
  }
};
