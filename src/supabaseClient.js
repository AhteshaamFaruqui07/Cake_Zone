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


// ============================================================================
// Google OAuth Sign-In Helper
// ============================================================================
export const signInWithGoogle = async () => {
  const isInIframe = typeof window !== "undefined" && window.self !== window.top;
  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: isInIframe,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return { data, error };
  }

  // When running inside the AI Studio preview iframe, open Google OAuth in a popup
  // because Google blocks accounts.google.com from loading inside an iframe.
  if (isInIframe && data?.url) {
    const popup = window.open(
      data.url,
      "CakeZoneGoogleAuth",
      "width=520,height=640,menubar=no,toolbar=no,location=yes,status=no"
    );
    if (!popup) {
      window.location.href = data.url;
    }
  }

  return { data, error };
};


