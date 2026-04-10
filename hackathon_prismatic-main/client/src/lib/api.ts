// ──────────────────────────────────────────────
// EIFS — Axios API Client
// ──────────────────────────────────────────────

import axios from 'axios';

function getBaseURL(): string {
  // Use env var if set
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;

  // Use the same hostname as the browser (enables LAN/mobile access)
  return `http://${window.location.hostname}:3001`;
}

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 60000, // 60s — AI processing can be slow
});

export default api;
