import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solostar.dirent',
  appName: 'directrental',
  webDir: 'dist',
  server: {
    url: 'https://4a68ac3c-61af-48f5-90e0-422f18ed1794.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
