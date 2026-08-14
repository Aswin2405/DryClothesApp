export const BG_TASK = "rain-watch-task";
export const ALERT_LEAD_MINUTES = 45;
export const RAIN_THRESHOLD = 40;

export const CURRENT_GPS_ID = "current-gps";

// Mirrored by backend/src/lib/constants.js — keep the two in sync. The server
// stores these per device; this copy is the fallback used when it is unreachable.
export const DEFAULT_SETTINGS = {
  tempUnit:          "C",     // "C" | "F"
  windUnit:          "kmh",   // "kmh" | "mph"
  alertLeadMinutes:  ALERT_LEAD_MINUTES,
  quietHoursEnabled: false,
  quietHoursStart:   "22:00", // "HH:mm", local time
  quietHoursEnd:     "07:00",
  theme:             "system", // "system" | "light" | "dark"
};
