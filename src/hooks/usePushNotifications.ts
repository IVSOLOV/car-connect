import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';

export const usePushNotifications = () => {
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PushNotificationSchema[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const isPushSupported = Capacitor.isNativePlatform();
    setIsSupported(isPushSupported);

    if (!isPushSupported) {
      console.log('Push notifications are only supported on native platforms');
      return;
    }

    const registerNotifications = async () => {
      try {
        // Request permission
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }

        // Register for push notifications
        await PushNotifications.register();
      } catch (error) {
        console.error('Error registering for push notifications:', error);
      }
    };

    // Add listeners
    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setToken(token.value);
      // Here you can send the token to your backend to store it
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      setNotifications(prev => [...prev, notification]);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed:', notification);
      // Handle notification tap - navigate to relevant screen
    });

    registerNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  return { token, notifications, isSupported };
};
