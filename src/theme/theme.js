import { useColorScheme } from "react-native";

import { useSettingsContext } from "../context/SettingsContext";

export const darkPalette = {
  scheme:            "dark",
  statusBarStyle:    "light",
  bg:                "#07422A",
  blob:              "#155a36",
  card:              "rgba(255,255,255,0.07)",
  cardBorder:        "rgba(255,255,255,0.10)",
  textPrimary:       "#ffffff",
  textSecondary:     "rgba(255,255,255,0.65)",
  textMuted:         "rgba(255,255,255,0.45)",
  textFaint:         "rgba(255,255,255,0.25)",
  track:             "rgba(255,255,255,0.12)",
  divider:           "rgba(255,255,255,0.08)",
  accentGreen:       "#44dd88",
  accentGreenText:   "#07422A",
  accentOrange:      "#ffaa00",
  accentRed:         "#ff4455",
  accentPurple:      "#a78bfa",
  hourSafeBg:        "rgba(68,221,136,0.14)",
  hourWarnBg:        "rgba(255,170,0,0.18)",
  hourDangerBg:      "rgba(255,68,85,0.20)",
  alertBannerBg:     "rgba(255,165,0,0.18)",
  alertBannerBorder: "#ffaa0088",
  alertBannerText:   "#ffcc44",
};

export const lightPalette = {
  scheme:            "light",
  statusBarStyle:    "dark",
  bg:                "#eef6f0",
  blob:              "#cdeadb",
  card:              "rgba(7,66,42,0.05)",
  cardBorder:        "rgba(7,66,42,0.10)",
  textPrimary:       "#0b2e1c",
  textSecondary:     "rgba(11,46,28,0.65)",
  textMuted:         "rgba(11,46,28,0.45)",
  textFaint:         "rgba(11,46,28,0.30)",
  track:             "rgba(11,46,28,0.10)",
  divider:           "rgba(11,46,28,0.08)",
  accentGreen:       "#1f9d5c",
  accentGreenText:   "#ffffff",
  accentOrange:      "#c97a00",
  accentRed:         "#d6304a",
  accentPurple:      "#7c5fd0",
  hourSafeBg:        "rgba(31,157,92,0.12)",
  hourWarnBg:        "rgba(201,122,0,0.14)",
  hourDangerBg:      "rgba(214,48,74,0.14)",
  alertBannerBg:     "rgba(201,122,0,0.14)",
  alertBannerBorder: "#c97a0055",
  alertBannerText:   "#8a5400",
};

export function useTheme() {
  const { settings } = useSettingsContext();
  const system = useColorScheme();
  const resolved = settings.theme === "system" ? (system || "dark") : settings.theme;
  return resolved === "light" ? lightPalette : darkPalette;
}
