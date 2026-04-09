import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const GEOLOCATION_TIMEOUT_MS = 9000;
const GEOLOCATION_MAX_AGE_MS = 600000;

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

const hasNativeLocationPermission = (
  permissions: Awaited<ReturnType<typeof Geolocation.checkPermissions>>,
) => permissions.location === 'granted' || permissions.coarseLocation === 'granted';

const getNativeCurrentPosition = async (): Promise<GeoPosition> => {
  let permissions = await Geolocation.checkPermissions();

  if (!hasNativeLocationPermission(permissions)) {
    permissions = await Geolocation.requestPermissions();
  }

  if (!hasNativeLocationPermission(permissions)) {
    throw new Error('Location permission not granted');
  }

  const position = await Promise.race([
    Geolocation.getCurrentPosition({
      timeout: GEOLOCATION_TIMEOUT_MS,
      enableHighAccuracy: false,
      maximumAge: GEOLOCATION_MAX_AGE_MS,
    }),
    new Promise<never>((_, reject) => {
      globalThis.setTimeout(() => {
        reject(new Error('Native geolocation request timed out'));
      }, GEOLOCATION_TIMEOUT_MS);
    }),
  ]);

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};

export async function getCurrentPosition(): Promise<GeoPosition> {
  if (Capacitor.isNativePlatform()) {
    return getNativeCurrentPosition();
  }

  return new Promise<GeoPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    let settled = false;

    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Geolocation request timed out'));
    }, GEOLOCATION_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        reject(error);
      },
      {
        timeout: 8000,
        enableHighAccuracy: false,
        maximumAge: GEOLOCATION_MAX_AGE_MS,
      }
    );
  });
}
