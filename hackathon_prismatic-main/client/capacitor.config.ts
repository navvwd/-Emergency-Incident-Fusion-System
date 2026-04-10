import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eifs.sentinel',
  appName: 'AI-01 SENTINEL',
  webDir: 'dist',
  server: {
    // For development: point to your dev machine's IP
    // Change this to your computer's local IP address
    // url: 'http://192.168.x.x:5173',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
