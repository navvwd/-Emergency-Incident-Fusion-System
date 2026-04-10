"use strict";
// ──────────────────────────────────────────────
// EIFS — Supabase Client (Service Role)
// Server-side client with full DB access
// ──────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — DB operations will fail');
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl || '', supabaseServiceKey || '');
//# sourceMappingURL=supabase.js.map