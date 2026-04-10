// ──────────────────────────────────────────────
// EIFS — Axios API Client
// ──────────────────────────────────────────────

import axios from 'axios';
<<<<<<< HEAD
import { Capacitor } from '@capacitor/core';
=======
>>>>>>> c91130b (naveeth changes)

function getBaseURL(): string {
  // Use env var if set
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;

<<<<<<< HEAD
  // On native Android/iOS, localhost refers to the device itself.
  // Use 10.0.2.2 for Android emulator, or set VITE_API_URL to your machine's LAN IP.
  if (Capacitor.isNativePlatform()) {
    return 'http://10.0.2.2:3001';
  }

=======
>>>>>>> c91130b (naveeth changes)
  // Use the same hostname as the browser (enables LAN/mobile access)
  return `http://${window.location.hostname}:3001`;
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000, // 60s — AI processing can be slow
});

export default api;
