import { createBrowserClient } from "@supabase/ssr";
import { supabasePublicEnv } from "@/lib/env";

// Supabase-client voor gebruik in client components (browser).
export function createClient() {
  const { url, anonKey } = supabasePublicEnv();
  return createBrowserClient(url, anonKey);
}
