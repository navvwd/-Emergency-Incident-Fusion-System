// ──────────────────────────────────────────────
// EIFS — Supabase Client (Service Role)
// Server-side client with full DB access
// ──────────────────────────────────────────────

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — DB operations will fail'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);
