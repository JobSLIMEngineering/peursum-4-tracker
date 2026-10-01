import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicEnv } from "@/lib/env";

// Supabase-client voor server components, server actions en route handlers.
// Gebruikt de login-cookies van de bezoeker, dus Row Level Security blijft van kracht.
export async function createClient() {
  const { url, anonKey } = supabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Vanuit een server component kunnen geen cookies gezet worden;
          // de proxy (stap 4) ververst de sessie dan.
        }
      },
    },
  });
}
