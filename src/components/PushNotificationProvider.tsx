import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PushNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[Push][Startup] PushNotificationProvider mounted');
    return () => {
      console.log('[Push][Startup] PushNotificationProvider unmounted');
    };
  }, []);

  useEffect(() => {
    console.log('[Push][Startup] Auth user observed by push provider:', user?.id ?? null);
  }, [user?.id]);

  const handleNotificationTap = useCallback((data: Record<string, string>) => {
    console.log('[Push] Notification tapped, data:', data);
    const type = data.type;

    if (type === 'message') {
      // Navigate to messages page — the listing_id/sender_id can be used to auto-open the conversation
      const params = new URLSearchParams();
      if (data.listing_id) params.set('listing_id', data.listing_id);
      if (data.sender_id) params.set('sender_id', data.sender_id);
      const query = params.toString();
      navigate(`/messages${query ? `?${query}` : ''}`);
    } else if (type === 'ticket_response') {
      navigate('/support-tickets');
    } else if (type === 'listing_approved' || type === 'listing_rejected') {
      navigate('/my-listings');
    } else if (type === 'admin_new_listing') {
      navigate('/approval-requests');
    } else if (type === 'admin_new_ticket') {
      navigate('/admin');
    } else {
      // Default: go to messages
      navigate('/messages');
    }
  }, [navigate]);

  usePushNotifications(user?.id, handleNotificationTap);

  return <>{children}</>;
};

export default PushNotificationProvider;
