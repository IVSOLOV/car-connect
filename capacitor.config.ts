import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solostar.dirent',
  appName: 'directrental',
  webDir: 'dist',
  server: {
    url: 'https://directrental.lovable.app?forceHideBadge=true&v=20260214_3',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
