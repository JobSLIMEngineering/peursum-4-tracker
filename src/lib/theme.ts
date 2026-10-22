/** Licht / donker / automatisch (volgt de telefoon). Keuze per apparaat in localStorage. */
export type ThemeChoice = "auto" | "light" | "dark";

const KEY = "p4-theme";

/** Draait vóór de eerste weergave (in <head>), zodat er geen flits van het verkeerde thema is */
export const THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${KEY}")||"auto";var d=c==="auto"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):c;document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export function getTheme(): ThemeChoice {
  try {
    const c = localStorage.getItem(KEY);
    return c === "light" || c === "dark" ? c : "auto";
  } catch {
    return "auto";
  }
}

const resolve = (c: ThemeChoice): "light" | "dark" =>
  c === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : c;

export function applyTheme(c: ThemeChoice, fade = true) {
  const html = document.documentElement;
  if (fade) {
    html.classList.add("theme-fade");
    setTimeout(() => html.classList.remove("theme-fade"), 350);
  }
  html.dataset.theme = resolve(c);
}

export function setTheme(c: ThemeChoice) {
  try {
    if (c === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, c);
  } catch {
    // geen opslag: alleen voor deze sessie
  }
  applyTheme(c);
}

/** Bij "automatisch" meeschakelen als de telefoon wisselt */
export function watchSystemTheme(): () => void {
  const mq = matchMedia("(prefers-color-scheme: light)");
  const on = () => getTheme() === "auto" && applyTheme("auto");
  mq.addEventListener("change", on);
  return () => mq.removeEventListener("change", on);
}
