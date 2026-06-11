import { RAIN_THRESHOLD } from "./constants";
import { calcDryingScore, decodeWMO, formatDay, formatHour } from "./score";

export async function fetchOpenMeteo(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weathercode,windspeed_10m,uv_index,` +
    `precipitation_probability,relativehumidity_2m` +
    `&hourly=temperature_2m,precipitation_probability,weathercode,relativehumidity_2m` +
    `&daily=temperature_2m_max,precipitation_probability_max,weathercode,sunrise,sunset` +
    `&timezone=auto&forecast_days=5&forecast_hours=24`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather fetch failed");
  return res.json();
}

export async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { "User-Agent": "DryClothesToday/1.0" } }
    );
    const json = await res.json();
    const a = json.address || {};
    return a.city || a.town || a.village || a.county || a.state_district || a.state || "Your Location";
  } catch {
    return "Your Location";
  }
}

export function parseWeather(json) {
  const cur        = json.current;
  const rainChance = cur.precipitation_probability ?? 0;
  const humidity   = cur.relativehumidity_2m ?? 60;
  const uvi        = cur.uv_index ?? null;
  const wind       = Math.round(cur.windspeed_10m);

  const hourly = json.hourly.time.slice(0, 24).map((t, i) => ({
    hour:     i === 0 ? "Now" : formatHour(t),
    isoTime:  t,
    pop:      json.hourly.precipitation_probability[i] ?? 0,
    temp:     Math.round(json.hourly.temperature_2m[i]),
    humidity: json.hourly.relativehumidity_2m?.[i] ?? 60,
    wmo:      json.hourly.weathercode[i],
  }));

  let hourlyAlert = null;
  let rainEtaIso  = null;
  for (let i = 1; i < hourly.length; i++) {
    if (hourly[i].pop >= RAIN_THRESHOLD) {
      hourlyAlert = `⚠️ Rain expected at ${hourly[i].hour} (${hourly[i].pop}% chance)`;
      rainEtaIso  = hourly[i].isoTime;
      break;
    }
  }

  const daily = json.daily.time.map((t, i) => ({
    day:  formatDay(t, i),
    high: Math.round(json.daily.temperature_2m_max[i]),
    pop:  json.daily.precipitation_probability_max[i] ?? 0,
    icon: decodeWMO(json.daily.weathercode[i]).emoji,
  }));

  const score = calcDryingScore({ rainChance, uvi, wind, humidity });

  return {
    temp:           Math.round(cur.temperature_2m),
    rainChance,
    wind,
    uvi,
    humidity,
    condition:      decodeWMO(cur.weathercode).label,
    conditionEmoji: decodeWMO(cur.weathercode).emoji,
    hourlyAlert,
    rainEtaIso,
    sunriseIso:     json.daily.sunrise?.[0] ?? null,
    sunsetIso:      json.daily.sunset?.[0]  ?? null,
    hourly,
    daily,
    score,
  };
}
