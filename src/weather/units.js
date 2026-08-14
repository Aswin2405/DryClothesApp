// Display-only unit conversion. Scoring/dry-by math always stays metric internally —
// only these formatters read the user's display preference.
export function formatTemp(celsius, unit) {
  if (unit === "F") return `${Math.round((celsius * 9) / 5 + 32)}°F`;
  return `${Math.round(celsius)}°C`;
}

export function formatWind(kmh, unit) {
  if (unit === "mph") return `${Math.round(kmh * 0.621371)} mph`;
  return `${Math.round(kmh)} km/h`;
}
