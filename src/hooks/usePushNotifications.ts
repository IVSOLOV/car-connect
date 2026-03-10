import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

export const usePushNotifications = (userId?: string) => {
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PushNotificationSchema[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const listenersRegistered = useRef(false);

  // Save token to database whenever we have both token AND userId
  useEffect(() => {
    if (!token || !userId) return;

    const saveToken = async () => {
      try {
        const { error } = await supabase
          .from('push_tokens')
          .upsert(
            { user_id: userId, token, platform: Capacitor.getPlatform() },
            { onConflict: 'user_id,token' }
          );

        if (error) {
          console.error('Error saving push token:', error);
        } else {
          console.log('Push token saved to database for user:', userId);
        }
      } catch (err) {
        console.error('Error saving push token:', err);
      }
    };

    saveToken();
  }, [token, userId]);

  // Register listeners and request permissions once
  useEffect(() => {
    const isPushSupported = Capacitor.isNativePlatform();
    setIsSupported(isPushSupported);

    if (!isPushSupported) {
      console.log('Push notifications are only supported on native platforms');
      return;
    }

    if (listenersRegistered.current) return;
    listenersRegistered.current = true;

    PushNotifications.addListener('registration', (t: Token) => {
      console.log('Push registration success, token:', t.value);
      setToken(t.value);
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
        console.log('PushNotifications.register() called');
      } catch (error) {
        console.error('Error registering for push notifications:', error);
      }
    };

    registerNotifications();

    return () => {
      PushNotifications.removeAllListeners();
      listenersRegistered.current = false;
    };
  }, []);

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
