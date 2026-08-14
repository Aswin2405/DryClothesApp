import { Platform } from "react-native";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import * as api from "../api";
import { updateWidgets } from "../widget/updateWidgets";
import { fetchOpenMeteo, parseWeather } from "./api";
import { ALERT_LEAD_MINUTES, BG_TASK, DEFAULT_SETTINGS } from "./constants";
import { applyQuietHours } from "./quietHours";
import { scoreLabel } from "./score";

// The background task / any caller without a live SettingsContext reads settings
// straight from the API (falling back to defaults if the server is unreachable)
// since it runs outside React.
async function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...(await api.fetchSettings()) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

const isNative = Platform.OS !== "web";

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  true,
    }),
  });
}

const ID_RAIN    = "dry-clothes-rain-alert";
const ID_SUNSET  = "dry-clothes-sunset-alert";
const ID_MORNING = "dry-clothes-morning-brief";

export async function scheduleSmartRainAlert(rainEtaIso, city, rainChance, leadMinutes = ALERT_LEAD_MINUTES, settings = null) {
  if (!isNative) return null;

  await Notifications.cancelScheduledNotificationAsync(ID_RAIN).catch(() => {});
  if (!rainEtaIso) return null;

  const rainTime  = new Date(rainEtaIso).getTime();
  let alertTime   = new Date(rainTime - leadMinutes * 60 * 1000);
  alertTime       = applyQuietHours(alertTime, settings ?? await loadSettings());

  if (alertTime.getTime() <= Date.now()) {
    // Only fire once per rain event — avoid spamming on every app open. If the
    // server can't be reached we let the notification through: a duplicate alert
    // beats a missed one for this app.
    let lastEta = null;
    try {
      ({ lastRainNotifEta: lastEta } = await api.fetchAlerts());
    } catch {}
    if (lastEta === rainEtaIso) return "immediate";

    await Notifications.scheduleNotificationAsync({
      identifier: ID_RAIN,
      content: {
        title: "🌧️ Rain arriving soon!",
        body:  `${rainChance}% rain chance in ${city}. Bring your clothes inside now!`,
        sound: true,
        badge: 1,
        data:  { type: "rain_imminent" },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.IMMEDIATE, channelId: "rain-alerts" },
    });
    await api.patchAlerts({ lastRainNotifEta: rainEtaIso }).catch(() => {});
    return "immediate";
  }

  await Notifications.scheduleNotificationAsync({
    identifier: ID_RAIN,
    content: {
      title: `☔ Rain coming in ${leadMinutes} minutes!`,
      body:  `${rainChance}% chance. Time to bring clothes inside in ${city}!`,
      sound: true,
      badge: 1,
      data:  { type: "rain_warning", eta: rainEtaIso },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alertTime, channelId: "rain-alerts" },
  });

  await api.patchAlerts({ lastAlertTime: alertTime.toISOString() }).catch(() => {});
  return alertTime;
}

export async function scheduleSunsetAlert(sunsetIso, city, settings = null) {
  if (!isNative) return;

  await Notifications.cancelScheduledNotificationAsync(ID_SUNSET).catch(() => {});
  if (!sunsetIso) return;

  let sunsetTime = new Date(sunsetIso);
  sunsetTime     = applyQuietHours(sunsetTime, settings ?? await loadSettings());
  if (sunsetTime.getTime() <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: ID_SUNSET,
    content: {
      title: "🌅 Sun has set!",
      body:  `It's sunset in ${city}. Bring your clothes inside before they get damp!`,
      sound: true,
      badge: 1,
      data:  { type: "sunset" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sunsetTime, channelId: "rain-alerts" },
  });
}

export async function scheduleMorningBrief(weather, city) {
  if (!isNative) return;

  await Notifications.cancelScheduledNotificationAsync(ID_MORNING).catch(() => {});

  const { score, rainChance, conditionEmoji } = weather;
  const { text: scoreText } = scoreLabel(score);

  let body;
  if (rainChance >= 60) {
    body = `${conditionEmoji} Rain likely today (${rainChance}%). Keep clothes inside.`;
  } else if (score >= 75) {
    body = `${conditionEmoji} Perfect drying day in ${city}! Score: ${score}/100. Hang those clothes!`;
  } else if (score >= 55) {
    body = `${conditionEmoji} Good drying conditions in ${city} today. Score: ${score}/100.`;
  } else if (score >= 35) {
    body = `${conditionEmoji} Risky drying day in ${city}. Score: ${score}/100. Keep an eye on the weather.`;
  } else {
    body = `${conditionEmoji} Poor drying conditions in ${city} today. Score: ${score}/100. Best to skip outdoor drying.`;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: ID_MORNING,
    content: {
      title: `Good morning! Today's drying forecast`,
      body,
      sound: true,
      data:  { type: "morning_brief" },
    },
    trigger: {
      type:      Notifications.SchedulableTriggerInputTypes.DAILY,
      hour:      7,
      minute:    0,
      channelId: "rain-alerts",
    },
  });
}

if (isNative) {
  TaskManager.defineTask(BG_TASK, async () => {
    try {
      // One request gets the toggle, the armed location, its last coords and the
      // settings — this task runs on a short OS-granted wake-up, so round trips
      // are the thing worth saving.
      const snapshot = await api.fetchSnapshot();

      if (!snapshot.alertEnabled) return BackgroundFetch.BackgroundFetchResult.NoData;

      const notifyId = snapshot.notifyLocationId;
      const loc      = snapshot.notifyLocation;
      if (!notifyId || !loc) return BackgroundFetch.BackgroundFetchResult.NoData;

      let lat, lon, city;
      if (loc.isCurrentGPS) {
        // No GPS fix from a background task — reuse the last known position.
        const cached = snapshot.notifyCache?.coords;
        if (cached?.lat == null || cached?.lon == null) return BackgroundFetch.BackgroundFetchResult.NoData;
        lat  = cached.lat;
        lon  = cached.lon;
        city = cached.city ?? loc.name;
      } else {
        lat = loc.lat; lon = loc.lon; city = loc.name;
      }

      const weather  = parseWeather(await fetchOpenMeteo(lat, lon));
      const settings = { ...DEFAULT_SETTINGS, ...snapshot.settings };
      const now      = new Date().toISOString();
      const full     = { ...weather, updatedAt: now };

      await api.putWeatherCache(notifyId, { coords: { lat, lon, city }, weatherFull: full, updatedAt: now });

      // Widgets render the active location, so only redraw when that is the one
      // we just refreshed.
      if (snapshot.activeLocationId === notifyId) await updateWidgets();

      if (weather.rainEtaIso) {
        await scheduleSmartRainAlert(weather.rainEtaIso, city, weather.rainChance, settings.alertLeadMinutes, settings);
      } else {
        await Notifications.cancelScheduledNotificationAsync(ID_RAIN).catch(() => {});
      }
      await scheduleSunsetAlert(weather.sunsetIso, city, settings);
      await scheduleMorningBrief(weather, city);

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerBackgroundTask() {
  if (!isNative) return false;

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) return false;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BG_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BG_TASK, {
        minimumInterval: 30 * 60,
        stopOnTerminate: false,
        startOnBoot:     true,
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function unregisterBackgroundTask() {
  if (!isNative) return;

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BG_TASK);
    if (isRegistered) await BackgroundFetch.unregisterTaskAsync(BG_TASK);
    await Notifications.cancelScheduledNotificationAsync(ID_RAIN).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(ID_SUNSET).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(ID_MORNING).catch(() => {});
  } catch {}
}
