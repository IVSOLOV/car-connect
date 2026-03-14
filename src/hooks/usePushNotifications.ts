import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

const PENDING_PUSH_TOKEN_KEY = 'push_token_pending_registration';

const getCachedPushToken = (): string | null => {
  try {
    return localStorage.getItem(PENDING_PUSH_TOKEN_KEY);
  } catch (error) {
    console.error('[Push] Failed to read cached push token:', error);
    return null;
  }
};

const setCachedPushToken = (pushToken: string) => {
  try {
    localStorage.setItem(PENDING_PUSH_TOKEN_KEY, pushToken);
    console.log('[Push] Cached token locally for deferred persistence');
  } catch (error) {
    console.error('[Push] Failed to cache push token locally:', error);
  }
};

const clearCachedPushToken = () => {
  try {
    localStorage.removeItem(PENDING_PUSH_TOKEN_KEY);
    console.log('[Push] Cleared cached push token after successful persistence');
  } catch (error) {
    console.error('[Push] Failed to clear cached push token:', error);
  }
};

export const usePushNotifications = (userId?: string) => {
  const [token, setToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<PushNotificationSchema[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const listenersRegistered = useRef(false);

  const saveTokenToDatabase = useCallback(
    async (tokenToSave: string, reason: 'registration' | 'token-state' | 'auth-change') => {
      const nativePlatform = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();

      if (!nativePlatform) {
        console.log('[Push] Skipping DB save on non-native platform');
        return;
      }

      if (!userId) {
        console.log('[Push] Skipping DB save because no authenticated user id is available yet');
        return;
      }

      const payload = {
        user_id: userId,
        token: tokenToSave,
        platform,
      };

      console.log('[Push] Saving token payload to database:', { payload, reason });

      try {
        const { data, error } = await supabase
          .from('push_tokens')
          .upsert(payload, { onConflict: 'user_id,token' })
          .select('id, user_id, token, platform, created_at, updated_at');

        if (error) {
          console.error('[Push] DB upsert failed:', error);
          return;
        }

        console.log('[Push] DB upsert success response:', data);
        clearCachedPushToken();
      } catch (error) {
        console.error('[Push] Unexpected DB upsert failure:', error);
      }
    },
    [userId]
  );

  useEffect(() => {
    console.log('[Push] Current authenticated user id:', userId ?? null);
  }, [userId]);

  // Persist state token when user id is available
  useEffect(() => {
    if (!token) return;
    if (!userId) {
      setCachedPushToken(token);
      return;
    }

    void saveTokenToDatabase(token, 'token-state');
  }, [token, userId, saveTokenToDatabase]);

  // Flush cached token after auth state change/login
  useEffect(() => {
    if (!userId) return;

    const cachedToken = getCachedPushToken();
    if (!cachedToken) {
      console.log('[Push] No cached token to flush after auth change');
      return;
    }

    console.log('[Push] Found cached token after auth change; attempting persistence now');
    setToken((currentToken) => currentToken ?? cachedToken);
    void saveTokenToDatabase(cachedToken, 'auth-change');
  }, [userId, saveTokenToDatabase]);

  // Register listeners and request permissions once
  useEffect(() => {
    const nativePlatform = Capacitor.isNativePlatform();
    console.log('[Push] Capacitor.isNativePlatform():', nativePlatform);

    setIsSupported(nativePlatform);

    if (!nativePlatform) {
      console.log('[Push] Push notifications are only supported on native platforms');
      return;
    }

    if (listenersRegistered.current) return;
    listenersRegistered.current = true;

    PushNotifications.addListener('registration', (registrationToken: Token) => {
      console.log('[Push] registration token received:', registrationToken.value);
      setCachedPushToken(registrationToken.value);
      setToken(registrationToken.value);

      if (userId) {
        void saveTokenToDatabase(registrationToken.value, 'registration');
      } else {
        console.log('[Push] Token received before login; cached and waiting for auth state change');
      }
    });

    PushNotifications.addListener('registrationError', (error: unknown) => {
      console.error('[Push] registrationError:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[Push] pushNotificationReceived:', notification);
      setNotifications((previous) => [...previous, notification]);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('[Push] pushNotificationActionPerformed:', notification);
    });

    const registerNotifications = async () => {
      try {
        let permissionStatus = await PushNotifications.checkPermissions();
        console.log('[Push] PushNotifications.checkPermissions() result:', permissionStatus);

        if (permissionStatus.receive === 'prompt') {
          permissionStatus = await PushNotifications.requestPermissions();
          console.log('[Push] PushNotifications.requestPermissions() result:', permissionStatus);
        }

        if (permissionStatus.receive !== 'granted') {
          console.log('[Push] Push notification permission not granted');
          return;
        }

        console.log('[Push] PushNotifications.register() called');
        await PushNotifications.register();
      } catch (error) {
        console.error('[Push] Error registering for push notifications:', error);
      }
    };

    void registerNotifications();

    return () => {
      PushNotifications.removeAllListeners();
      listenersRegistered.current = false;
    };
  }, [userId, saveTokenToDatabase]);

  const removeToken = useCallback(async () => {
    const nativePlatform = Capacitor.isNativePlatform();

    if (!nativePlatform) {
      console.log('[Push] Skipping token delete on non-native platform');
      return;
    }

    if (!userId || !token) return;

    try {
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);
    } catch (error) {
      console.error('[Push] Error removing push token:', error);
    }
  }, [userId, token]);

  return { token, notifications, isSupported, removeToken };
};
