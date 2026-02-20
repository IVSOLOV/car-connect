import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PushNotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  usePushNotifications(user?.id);
  return <>{children}</>;
};

export default PushNotificationProvider;
