export const PANEL_THEMES = [
  {
    key: "dogal",
    label: "Doğal",
    blurb: "Yeşil ve sakin",
    icon: "leaf",
    mark: "🌿",
  },
  {
    key: "dinamik",
    label: "Dinamik",
    blurb: "Mavi ve turuncu",
    icon: "zap",
    mark: "⚡",
  },
  {
    key: "renkli",
    label: "Renkli",
    blurb: "Canlı ve eğlenceli",
    icon: "sparkles",
    mark: "🌈",
  },
  {
    key: "sade",
    label: "Sade",
    blurb: "Nötr ve minimal",
    icon: "minus",
    mark: "✨",
  },
] as const;

export type PanelTheme = (typeof PANEL_THEMES)[number]["key"];

export function normalizePanelTheme(value: string | null | undefined): PanelTheme {
  const key = String(value || "").trim();
  if (key === "dinamik" || key === "renkli" || key === "sade" || key === "dogal") return key;
  return "dogal";
}

export const MOODS = [
  { key: "iyi", label: "İyi hissediyorum", emoji: "😊" },
  { key: "normal", label: "Normalim", emoji: "😐" },
  { key: "yorgun", label: "Yorgunum", emoji: "😴" },
  { key: "zorlaniyorum", label: "Zorlanıyorum", emoji: "😣" },
] as const;

export type MoodKey = (typeof MOODS)[number]["key"];

export function moodLabel(key: string | null | undefined) {
  return MOODS.find((m) => m.key === key)?.label ?? "";
}

export const STRUGGLE_REASONS = [
  { key: "aclik", label: "Açlık" },
  { key: "tatli", label: "Tatlı isteği" },
  { key: "stres", label: "Stres" },
  { key: "disarida", label: "Dışarıda yemek" },
  { key: "plan", label: "Plana uyamadım" },
  { key: "diger", label: "Diğer" },
] as const;
