// Leest een verplichte omgevingsvariabele en geeft een duidelijke fout als die ontbreekt.
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Omgevingsvariabele ${name} ontbreekt. Zie .env.example en README.md.`,
    );
  }
  return value;
}

// NEXT_PUBLIC_-variabelen moeten letterlijk uitgeschreven worden,
// anders kan Next.js ze niet in de browsercode invullen.
export function supabasePublicEnv() {
  return {
    url: requireEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    anonKey: requireEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
