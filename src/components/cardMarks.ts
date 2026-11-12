import type { AppView } from "@/lib/store/view";

/** Tekens voor in de spelerskaart: upgrade, aftrek bij afwezigheid, on fire en geblesseerd */
export function cardMarks(view: AppView, id: string) {
  const card = view.cards[id];
  return {
    up: view.upgrades[id] || undefined,
    down: card?.penalty || undefined,
    fire: view.streaks[id]?.[0]?.kind,
    injured: view.injuredLast.has(id),
  };
}
