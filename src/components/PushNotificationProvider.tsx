import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PushNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  useEffect(() => {
    console.log('[Push][Startup] PushNotificationProvider mounted');
    return () => {
      console.log('[Push][Startup] PushNotificationProvider unmounted');
    };
  }, []);

  useEffect(() => {
    console.log('[Push][Startup] Auth user observed by push provider:', user?.id ?? null);
  }, [user?.id]);

  usePushNotifications(user?.id);

  return <>{children}</>;
};

export default PushNotificationProvider;
