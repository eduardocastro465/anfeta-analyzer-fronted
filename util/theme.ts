export function resolveTheme(tema: string): "light" | "dark" {
  if (tema === "light" || tema === "dark") return tema;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function applyThemeToDom(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
}