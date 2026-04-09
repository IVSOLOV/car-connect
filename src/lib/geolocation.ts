import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

const GEOLOCATION_TIMEOUT_MS = 9000;

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export async function getCurrentPosition(): Promise<GeoPosition> {
  if (Capacitor.isNativePlatform()) {
    // Use native Capacitor geolocation (handles permission prompts)
    const position = await Geolocation.getCurrentPosition({
      timeout: GEOLOCATION_TIMEOUT_MS,
      enableHighAccuracy: false,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }

  // Web fallback
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
        maximumAge: 600000,
      }
    );
  });
}
