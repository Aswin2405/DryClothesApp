import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";

import * as api from "../api";
import { notify } from "../lib/dialog";
import { fetchOpenMeteo, parseWeather, reverseGeocode } from "../weather/api";
import { buildTamilMessage } from "../weather/score";
import {
  registerBackgroundTask,
  scheduleMorningBrief,
  scheduleSmartRainAlert,
  scheduleSunsetAlert,
  unregisterBackgroundTask,
} from "../weather/tasks";
import { updateWidgets } from "../widget/updateWidgets";

// Only schedule alerts when enabled — centralises the gate so callers don't need to check.
// The toggle lives on the server, which is also what the background task reads.
async function scheduleAlertsIfEnabled(w, cityName, settings) {
  let enabled = false;
  try {
    ({ alertEnabled: enabled } = await api.fetchAlerts());
  } catch {
    return null; // can't confirm the toggle — leave whatever is already scheduled alone
  }
  if (!enabled) return null;

  let nextAlert = null;
  if (w.rainEtaIso) {
    nextAlert = await scheduleSmartRainAlert(w.rainEtaIso, cityName, w.rainChance, settings.alertLeadMinutes, settings);
  }
  await scheduleSunsetAlert(w.sunsetIso, cityName, settings);
  await scheduleMorningBrief(w, cityName);
  return nextAlert;
}

// Stores this location's forecast on the server and — only when it's the active
// one — redraws the home-screen widgets, which read the same row back.
// Deliberately best-effort: a cache write failing must not blank a screen that
// already has good weather on it.
async function saveCaches(w, cityName, lat, lon, locationId, isActive) {
  const now  = new Date().toISOString();
  const full = { ...w, updatedAt: now };

  try {
    await api.putWeatherCache(locationId, { coords: { lat, lon, city: cityName }, weatherFull: full, updatedAt: now });
    if (isActive) await updateWidgets();
  } catch {}

  return full;
}

function fmtTime(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// `location`: { activeLocation, notifyLocationId, setNotifyLocation } from LocationsContext.
export function useWeather(settings, location) {
  const [phase, setPhase]               = useState("init");
  const [city, setCity]                 = useState("Detecting…");
  const [coords, setCoords]             = useState(null);
  const [weather, setWeather]           = useState(null);
  const [lastUpdated, setLastUpdated]   = useState("");
  const [errorMsg, setErrorMsg]         = useState("");
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [nextAlert, setNextAlert]       = useState(null);
  const [alertLoading, setAlertLoading] = useState(false);

  const refreshingRef  = useRef(false); // prevent concurrent background refreshes
  const silentRefRef   = useRef(null);  // stable ref for AppState listener
  const appStateRef    = useRef(AppState.currentState);

  // Always-current refs for values read inside closures below, so effects
  // keyed only on an id (not on every settings/location object change) don't
  // capture stale data.
  const settingsRef        = useRef(settings);
  const activeLocationRef  = useRef(location.activeLocation);
  const notifyLocationIdRef = useRef(location.notifyLocationId);
  settingsRef.current         = settings;
  activeLocationRef.current   = location.activeLocation;
  notifyLocationIdRef.current = location.notifyLocationId;

  // Restore alert toggle preference
  useEffect(() => {
    api.fetchAlerts()
      .then(({ alertEnabled: enabled }) => setAlertEnabled(!!enabled))
      .catch(() => {});
  }, []);

  // Fetches weather for `loc`. `spinner=true` shows the full-screen loading
  // flow (permission dance for GPS locations, error screen on failure);
  // `spinner=false` updates in the background with no visible phase change.
  async function runFetch(loc, spinner) {
    if (spinner) setPhase(loc.isCurrentGPS ? "locating" : "loading");
    try {
      let lat, lon, cityName;

      if (loc.isCurrentGPS) {
        if (spinner) {
          const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
          if (locStatus !== "granted") { setPhase("noperm"); return; }
          await Location.requestBackgroundPermissionsAsync();
          setPhase("loading");
        } else {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== "granted") return;
        }
        const loc2 = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc2.coords.latitude;
        lon = loc2.coords.longitude;
        cityName = await reverseGeocode(lat, lon);
      } else {
        lat = loc.lat;
        lon = loc.lon;
        cityName = loc.name;
      }

      const meteoJson = await fetchOpenMeteo(lat, lon);
      const w   = parseWeather(meteoJson);
      const now = new Date();

      setCity(cityName);
      setWeather(w);
      setCoords({ lat, lon });
      setLastUpdated(fmtTime(now));
      await saveCaches(w, cityName, lat, lon, loc.id, loc.id === activeLocationRef.current?.id);

      if (spinner && Platform.OS !== "web") {
        const { status: notifStatus } = await Notifications.requestPermissionsAsync();
        if (notifStatus !== "granted") {
          notify("Notifications off", "Enable notifications in Settings to get rain alerts.");
        }
        await registerBackgroundTask();
      }

      if (loc.id === notifyLocationIdRef.current) {
        const next = await scheduleAlertsIfEnabled(w, cityName, settingsRef.current);
        setNextAlert(next);
      }

      if (spinner) setPhase("ready");
    } catch (err) {
      if (spinner) {
        setErrorMsg(err.message || "Something went wrong");
        setPhase("error");
      }
    }
  }

  // Load whichever location is active: paint its stored forecast instantly if the
  // server has one (then silently refresh), otherwise run the full first-time fetch.
  async function loadForLocation(loc) {
    let cached = null;
    try {
      cached = await api.fetchWeatherCache(loc.id);
    } catch {}

    if (cached?.weatherFull) {
      setWeather(cached.weatherFull);
      setCity(cached.coords?.city || loc.name);
      setCoords({ lat: cached.coords?.lat, lon: cached.coords?.lon });
      if (cached.weatherFull.updatedAt) setLastUpdated(fmtTime(cached.weatherFull.updatedAt));
      setPhase("ready");
      runFetch(loc, false);
    } else {
      await runFetch(loc, true);
    }
  }

  // Boot, and reload whenever the active location changes.
  useEffect(() => {
    if (location.activeLocation?.id) loadForLocation(location.activeLocation);
  }, [location.activeLocation?.id]);

  function init() {
    return runFetch(activeLocationRef.current, true);
  }

  // Silent refresh — updates UI without a spinner; skips if already in progress
  async function silentRefresh() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    await runFetch(activeLocationRef.current, false);
    refreshingRef.current = false;
  }

  // Keep AppState listener pointed at latest silentRefresh without re-subscribing
  silentRefRef.current = silentRefresh;

  useEffect(() => {
    const sub = AppState.addEventListener("change", nextState => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        silentRefRef.current?.();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Manual refresh — shows spinner because user explicitly asked
  async function refresh() {
    await runFetch(activeLocationRef.current, true);
  }

  async function toggleAlert(value) {
    const previous = alertEnabled;
    setAlertEnabled(value);

    try {
      await api.patchAlerts({ alertEnabled: value });
    } catch {
      // The background task reads this flag from the server, so a UI-only toggle
      // would be a lie — put the switch back and say so.
      setAlertEnabled(previous);
      notify("Couldn't save", "Alerts could not be updated. Check your connection and try again.");
      return;
    }

    if (!value) {
      await unregisterBackgroundTask();
      await location.setNotifyLocation(null).catch(() => {});
      setNextAlert(null);
      return;
    }

    setAlertLoading(true);

    // Arming has to stick server-side — that record is what the background task
    // wakes up and reads. If it doesn't, undo the toggle rather than leave the
    // switch on with nothing behind it.
    try {
      await location.setNotifyLocation(activeLocationRef.current.id);
    } catch {
      await api.patchAlerts({ alertEnabled: false }).catch(() => {});
      setAlertEnabled(false);
      setAlertLoading(false);
      notify("Couldn't save", "The alert location could not be saved. Check your connection and try again.");
      return;
    }

    // Scheduling is local to the device and best-effort; a failure here does not
    // invalidate the toggle.
    try {
      await registerBackgroundTask();
      if (weather) {
        if (weather.rainEtaIso) {
          setNextAlert(await scheduleSmartRainAlert(
            weather.rainEtaIso, city, weather.rainChance,
            settingsRef.current.alertLeadMinutes, settingsRef.current
          ));
        }
        await scheduleSunsetAlert(weather.sunsetIso, city, settingsRef.current);
        await scheduleMorningBrief(weather, city);
      }
    } catch {}
    setAlertLoading(false);
  }

  async function speakTamil() {
    if (!weather) return;
    Speech.speak(buildTamilMessage(weather.rainChance, weather.wind, weather.score), {
      language: "ta-IN",
      rate: 0.85,
      pitch: 1.0,
    });
  }

  return {
    phase, city, weather, lastUpdated, errorMsg,
    alertEnabled, nextAlert, alertLoading,
    init, refresh, toggleAlert, speakTamil,
  };
}
