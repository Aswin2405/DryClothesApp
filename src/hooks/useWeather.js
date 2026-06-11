import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform } from "react-native";

import { fetchOpenMeteo, parseWeather, reverseGeocode } from "../weather/api";
import { STORAGE_KEYS } from "../weather/constants";
import { buildTamilMessage } from "../weather/score";
import {
  registerBackgroundTask,
  scheduleMorningBrief,
  scheduleSmartRainAlert,
  scheduleSunsetAlert,
  unregisterBackgroundTask,
} from "../weather/tasks";

// Only schedule alerts when enabled — centralises the gate so callers don't need to check
async function scheduleAlertsIfEnabled(w, cityName) {
  const alertVal = await AsyncStorage.getItem(STORAGE_KEYS.alertEnabled);
  if (alertVal !== "true") return null;

  let nextAlert = null;
  if (w.rainEtaIso) {
    nextAlert = await scheduleSmartRainAlert(w.rainEtaIso, cityName, w.rainChance);
  }
  await scheduleSunsetAlert(w.sunsetIso, cityName);
  await scheduleMorningBrief(w, cityName);
  return nextAlert;
}

async function saveCaches(w, cityName, lat, lon) {
  const now = new Date().toISOString();
  const full = { ...w, updatedAt: now };
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.cachedCoords, JSON.stringify({ lat, lon, city: cityName })),
    AsyncStorage.setItem(STORAGE_KEYS.cachedWeatherFull, JSON.stringify(full)),
    AsyncStorage.setItem(STORAGE_KEYS.cachedWeather, JSON.stringify({
      score: w.score, rainChance: w.rainChance, condition: w.condition,
      temp: w.temp, city: cityName, updatedAt: now,
    })),
  ]);
  return full;
}

function fmtTime(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function useWeather() {
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

  // Restore alert toggle preference
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.alertEnabled).then(v => {
      if (v === "true") setAlertEnabled(true);
    });
  }, []);

  // Boot: show cached data instantly, then refresh silently in background
  useEffect(() => {
    bootApp();
  }, []);

  async function bootApp() {
    try {
      const [cachedStr, coordsStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.cachedWeatherFull),
        AsyncStorage.getItem(STORAGE_KEYS.cachedCoords),
      ]);

      if (cachedStr && coordsStr) {
        const w = JSON.parse(cachedStr);
        const c = JSON.parse(coordsStr);
        setWeather(w);
        setCity(c.city || "");
        setCoords({ lat: c.lat, lon: c.lon });
        if (w.updatedAt) setLastUpdated(fmtTime(w.updatedAt));
        setPhase("ready");
        // Fresh data arrives silently — no spinner shown
        silentRefresh();
        return;
      }
    } catch {}

    // Nothing cached — full first-launch flow
    init();
  }

  const init = useCallback(async () => {
    setPhase("locating");
    try {
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus !== "granted") { setPhase("noperm"); return; }
      await Location.requestBackgroundPermissionsAsync();

      setPhase("loading");
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setCoords({ lat: latitude, lon: longitude });

      const [cityName, meteoJson] = await Promise.all([
        reverseGeocode(latitude, longitude),
        fetchOpenMeteo(latitude, longitude),
      ]);
      const w = parseWeather(meteoJson);
      const now = new Date();

      setCity(cityName);
      setWeather(w);
      setLastUpdated(fmtTime(now));
      await saveCaches(w, cityName, latitude, longitude);

      if (Platform.OS !== "web") {
        const { status: notifStatus } = await Notifications.requestPermissionsAsync();
        if (notifStatus !== "granted") {
          Alert.alert("Notifications off", "Enable notifications in Settings to get rain alerts.");
        }
        await registerBackgroundTask();
      }

      const next = await scheduleAlertsIfEnabled(w, cityName);
      setNextAlert(next);
      setPhase("ready");
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong");
      setPhase("error");
    }
  }, []);

  // Silent refresh — updates UI without a spinner; skips if already in progress
  async function silentRefresh() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      const [cityName, meteoJson] = await Promise.all([
        reverseGeocode(latitude, longitude),
        fetchOpenMeteo(latitude, longitude),
      ]);
      const w = parseWeather(meteoJson);
      const now = new Date();

      setCity(cityName);
      setWeather(w);
      setCoords({ lat: latitude, lon: longitude });
      setLastUpdated(fmtTime(now));
      await saveCaches(w, cityName, latitude, longitude);

      const next = await scheduleAlertsIfEnabled(w, cityName);
      setNextAlert(next);
    } catch {}
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
    setPhase("loading");
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") { init(); return; }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setCoords({ lat: latitude, lon: longitude });

      const [cityName, meteoJson] = await Promise.all([
        reverseGeocode(latitude, longitude),
        fetchOpenMeteo(latitude, longitude),
      ]);
      const w = parseWeather(meteoJson);
      const now = new Date();

      setCity(cityName);
      setWeather(w);
      setLastUpdated(fmtTime(now));
      await saveCaches(w, cityName, latitude, longitude);

      const next = await scheduleAlertsIfEnabled(w, cityName);
      setNextAlert(next);
      setPhase("ready");
    } catch (err) {
      setErrorMsg(err.message || "Refresh failed");
      setPhase("error");
    }
  }

  async function toggleAlert(value) {
    setAlertEnabled(value);
    await AsyncStorage.setItem(STORAGE_KEYS.alertEnabled, value ? "true" : "false");

    if (!value) {
      await unregisterBackgroundTask();
      setNextAlert(null);
      return;
    }

    setAlertLoading(true);
    try {
      await registerBackgroundTask();
      if (weather) {
        if (weather.rainEtaIso) {
          setNextAlert(await scheduleSmartRainAlert(weather.rainEtaIso, city, weather.rainChance));
        }
        await scheduleSunsetAlert(weather.sunsetIso, city);
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
