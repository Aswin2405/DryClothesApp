// Data layer for the Android home-screen widgets.
//
// Widgets are drawn from a headless JS task with no React tree and no contexts,
// so everything they need comes from a single /api/snapshot call here: the
// device's settings plus the active location's stored forecast, which the app
// (useWeather.saveCaches) and the rain-watch background task keep current. In
// the common case a widget redraw costs one request and no weather API call.
import * as api from "../api";
import { fetchOpenMeteo, parseWeather } from "../weather/api";
import { DEFAULT_SETTINGS } from "../weather/constants";

// Android only wakes the widget every 30 min (updatePeriodMillis floor), so
// anything older than this is worth a refetch when we're already awake.
export const WIDGET_STALE_MS = 25 * 60 * 1000;

// The snapshot shape every widget renders from. Kept flat and tiny — it is
// rebuilt from the stored forecast on every redraw.
export function buildWidgetPayload(weather, city, updatedAt) {
  return {
    score:          weather.score,
    rainChance:     weather.rainChance,
    condition:      weather.condition,
    conditionEmoji: weather.conditionEmoji,
    temp:           weather.temp,
    wind:           weather.wind,
    dryByIso:       weather.dryBy?.blocked ? null : weather.dryBy?.isoTime ?? null,
    city,
    updatedAt,
  };
}

// Collapses a server snapshot's active-location cache into the flat widget shape.
function payloadFromSnapshot(snapshot) {
  const cache = snapshot?.activeCache;
  if (!cache?.weatherFull) return null;
  const city = cache.coords?.city || snapshot?.activeLocation?.name || "";
  return buildWidgetPayload(cache.weatherFull, city, cache.updatedAt ?? cache.weatherFull.updatedAt ?? null);
}

// Where the active location currently is. Prefers the coords recorded with the
// last fetch (the only source for the GPS entry, since a headless task can't get
// a fix) and falls back to a saved location's own lat/lon, so a location added
// moments ago can still populate a widget.
function activeCoords(snapshot) {
  const cached = snapshot?.activeCache?.coords;
  const loc    = snapshot?.activeLocation;
  const lat    = cached?.lat ?? (loc?.isCurrentGPS ? null : loc?.lat ?? null);
  const lon    = cached?.lon ?? (loc?.isCurrentGPS ? null : loc?.lon ?? null);
  if (lat == null || lon == null) return null;
  return { lat, lon, city: cached?.city || loc?.name || "" };
}

// Refetches the active location's weather and writes it back to the server, so
// opening the app afterwards shows what the widget already shows.
export async function refreshWidgetPayload(snapshot) {
  const locationId = snapshot?.activeLocationId;
  const coords     = activeCoords(snapshot);
  if (!locationId || !coords) return null;

  const weather = parseWeather(await fetchOpenMeteo(coords.lat, coords.lon));
  const now     = new Date().toISOString();

  await api.putWeatherCache(locationId, {
    coords,
    weatherFull: { ...weather, updatedAt: now },
    updatedAt:   now,
  });

  return buildWidgetPayload(weather, coords.city, now);
}

// `refresh`: "never" (draw whatever is stored), "stale" (refetch if the stored
// forecast aged out), "force" (always refetch — used by the widget's refresh
// button). A failed refetch always falls back to the stored reading rather than
// blanking a widget, as does an unreachable server.
export async function getWidgetSnapshot({ refresh = "never" } = {}) {
  let snapshot = null;
  try {
    snapshot = await api.fetchSnapshot();
  } catch {
    return { data: null, settings: DEFAULT_SETTINGS };
  }

  const settings = { ...DEFAULT_SETTINGS, ...snapshot.settings };
  const cached   = payloadFromSnapshot(snapshot);

  const age = cached?.updatedAt ? Date.now() - new Date(cached.updatedAt).getTime() : Infinity;
  const shouldRefresh = refresh === "force" || (refresh === "stale" && age > WIDGET_STALE_MS);

  if (shouldRefresh) {
    try {
      const fresh = await refreshWidgetPayload(snapshot);
      if (fresh) return { data: fresh, settings };
    } catch {
      // offline / API down — the stored reading below is better than an empty widget
    }
  }

  return { data: cached, settings };
}
