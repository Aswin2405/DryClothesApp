// WMO weather code → label + emoji
export function decodeWMO(code) {
  if (code === 0)  return { label: "Clear Sky",     emoji: "☀️" };
  if (code <= 2)   return { label: "Partly Cloudy", emoji: "⛅" };
  if (code === 3)  return { label: "Overcast",      emoji: "☁️" };
  if (code <= 49)  return { label: "Foggy",         emoji: "🌫️" };
  if (code <= 59)  return { label: "Drizzle",       emoji: "🌦️" };
  if (code <= 69)  return { label: "Rainy",         emoji: "🌧️" };
  if (code <= 79)  return { label: "Snowy",         emoji: "❄️" };
  if (code <= 84)  return { label: "Rain Showers",  emoji: "🌧️" };
  if (code <= 99)  return { label: "Thunderstorm",  emoji: "⛈️" };
  return                 { label: "Unknown",        emoji: "🌡️" };
}

// Score 0–100: base 100, rain/humidity penalties, UV/wind bonuses
export function calcDryingScore({ rainChance, uvi, wind, humidity }) {
  let score = 100;
  score -= (rainChance / 100) * 60;
  score -= ((humidity ?? 60) / 100) * 20;
  score += Math.min((uvi ?? 0) / 8, 1) * 10;
  const windBonus = wind <= 20 ? wind / 20 : Math.max(0, 1 - (wind - 20) / 30);
  score += windBonus * 10;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function scoreLabel(score) {
  if (score >= 75) return { text: "Excellent",  color: "#44dd88", emoji: "✅" };
  if (score >= 55) return { text: "Good",       color: "#88cc44", emoji: "👍" };
  if (score >= 35) return { text: "Risky",      color: "#ffaa00", emoji: "⚠️" };
  if (score >= 15) return { text: "Poor",       color: "#ff7744", emoji: "🌦️" };
  return                 { text: "Don't Dry!", color: "#ff4455", emoji: "🚫" };
}

export function getRainRisk(rainChance) {
  if (rainChance >= 60) return "danger";
  if (rainChance >= 30) return "warning";
  return "safe";
}

export function getWindLabel(speed) {
  if (speed < 10) return { label: "Calm",                     icon: "🍃" };
  if (speed < 25) return { label: "Breezy – good for drying", icon: "🌬️" };
  if (speed < 40) return { label: "Strong wind",              icon: "💨" };
  return                { label: "Too windy",               icon: "🌪️" };
}

export function getSunLabel(uvi) {
  if (uvi == null) return { label: "Checking…",     icon: "❓" };
  if (uvi >= 8)    return { label: "Very strong UV", icon: "🔥" };
  if (uvi >= 5)    return { label: "Good sunlight",  icon: "☀️" };
  if (uvi >= 2)    return { label: "Moderate sun",   icon: "🌤️" };
  return                 { label: "Low sunlight",   icon: "🌥️" };
}

export function buildTamilMessage(rainChance, wind, score) {
  if (rainChance >= 60) return "Amma, ippo mazhai varum. Clothes veliyle podaatheenga!";
  if (rainChance >= 30) return "Kavanam! Sandhaippu neram mazhai varalaam. Clothes kashtama irukku.";
  if (wind > 35)        return "Katru romba jaasthi irukku. Clothes poidum!";
  if (score >= 75)      return "Ippo nalla neram! Drying score romba nalla irukku. Clothes dry panna perfect time.";
  return "Ippo nalla neram! Clothes dry panna sari aana time.";
}

export function formatHour(isoString) {
  const h = new Date(isoString).getHours();
  if (h === 0)  return "12AM";
  if (h < 12)   return `${h}AM`;
  if (h === 12) return "12PM";
  return `${h - 12}PM`;
}

export function formatDay(isoString, index) {
  if (index === 0) return "Today";
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date(isoString).getDay()];
}
