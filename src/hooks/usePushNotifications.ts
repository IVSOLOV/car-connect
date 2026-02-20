import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export const usePushNotifications = (userId?: string) => {
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PushNotificationSchema[]>([]);
  const [isSupported, setIsSupported] = useState(false);

  const saveTokenToDatabase = useCallback(async (fcmToken: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          { user_id: userId, token: fcmToken, platform: Capacitor.getPlatform() },
          { onConflict: 'user_id,token' }
        );

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved to database');
      }
    } catch (err) {
      console.error('Error saving push token:', err);
    }
  }, [userId]);

  useEffect(() => {
    const isPushSupported = Capacitor.isNativePlatform();
    setIsSupported(isPushSupported);

    if (!isPushSupported) {
      console.log('Push notifications are only supported on native platforms');
      return;
    }

    const registerNotifications = async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          console.log('Push notification permission not granted');
          return;
        }

        await PushNotifications.register();
      } catch (error) {
        console.error('Error registering for push notifications:', error);
      }
    };

    PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setToken(token.value);
      saveTokenToDatabase(token.value);
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
    });

    registerNotifications();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [saveTokenToDatabase]);

  const removeToken = useCallback(async () => {
    if (!userId || !token) return;
    try {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);
    } catch (err) {
      console.error('Error removing push token:', err);
    }
  }, [userId, token]);

  return { token, notifications, isSupported, removeToken };
};
