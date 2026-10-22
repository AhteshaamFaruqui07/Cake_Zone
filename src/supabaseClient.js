import { createClient } from "@supabase/supabase-js";

// ============================================================================
// 1. Paste your Supabase Project URL here:
// ============================================================================
const RAW_URL = "https://ldalvawsbuznlplwjhas.supabase.co";

// Automatically sanitizes URL if a REST endpoint or trailing slash was pasted
const SUPABASE_URL = RAW_URL.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");

// ============================================================================
// 2. Paste your Supabase Anon / Public Key here:
// ============================================================================
const SUPABASE_PUBLIC_KEY = "sb_publishable_h0GaOUO53tBrG95yWRy8sQ_nVr7tnM1";

// ============================================================================
// Initialize and export the Supabase client
// ============================================================================
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
