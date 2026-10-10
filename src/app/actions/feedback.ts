"use server";

import { createClient } from "@/lib/supabase/server";

export type FeedbackState = { ok: boolean; message: string } | null;

/** Slaat een melding van de feedbackknop op in de tabel `feedback`. */
export async function submitFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const tekst = String(formData.get("tekst") ?? "").trim().slice(0, 4000);
  const pagina = String(formData.get("pagina") ?? "/").slice(0, 300);
  const breedte = Number(formData.get("schermbreedte")) || null;
  if (!tekst) return { ok: false, message: "Typ eerst wat er niet werkt." };

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, message: "Log eerst in." };

    const { error } = await supabase.from("feedback").insert({ tekst, pagina, schermbreedte: breedte });
    if (error) throw error;
    return { ok: true, message: "Opgeslagen. Bedankt!" };
  } catch (e) {
    console.error("Feedback opslaan mislukt", e);
    return { ok: false, message: "Opslaan lukt nu niet. Probeer het later nog eens." };
  }
}
