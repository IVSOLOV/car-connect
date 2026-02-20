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

const notificationContent: Record<string, (data: NotificationData) => { title: string; body: string }> = {
  message: (data) => ({
    title: `New message from ${data.senderName || "someone"}`,
    body: data.messagePreview || "You have a new message on DiRent.",
  }),
  ticket_response: (data) => ({
    title: "Support ticket updated",
    body: `Your ticket "${data.ticketSubject || "Support Request"}" has a new response.`,
  }),
  listing_approved: (data) => ({
    title: "Listing approved! 🎉",
    body: `Your listing "${data.listingTitle}" is now live on DiRent.`,
  }),
  listing_rejected: (data) => ({
    title: "Listing update",
    body: `Your listing "${data.listingTitle}" needs changes.${data.rejectionReason ? ` Reason: ${data.rejectionReason}` : ""}`,
  }),
  admin_new_listing: (data) => ({
    title: "New listing pending approval",
    body: `${data.submitterName || "A user"} submitted "${data.listingTitle}".`,
  }),
  admin_new_ticket: (data) => ({
    title: "New support ticket",
    body: `${data.submitterName || "A user"}: ${data.ticketSubject}`,
  }),
};

const sendPushNotification = async (
  recipientUserId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  try {
    await supabase.functions.invoke("send-push-notification", {
      body: { recipientUserId, title, body, data },
    });
    console.log("Push notification sent to:", recipientUserId);
  } catch (err) {
    console.error("Error sending push notification:", err);
  }
};

export const sendNotificationEmail = async (
  type: NotificationType,
  recipientUserId: string | null,
  data: NotificationData
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Send email notification
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

    // Also send push notification (non-blocking)
    const content = notificationContent[type];
    if (content && recipientUserId) {
      const { title, body } = content(data);
      sendPushNotification(recipientUserId, title, body, { type }).catch(console.error);
    }

    // For admin notifications, send push to all admins
    if ((type === "admin_new_listing" || type === "admin_new_ticket") && content) {
      const { title, body } = content(data);
      // Fetch admin user IDs and send push to each
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      if (adminRoles) {
        for (const admin of adminRoles) {
          sendPushNotification(admin.user_id, title, body, { type }).catch(console.error);
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error invoking notification function:", err);
    return { success: false, error: err.message };
  }
};
