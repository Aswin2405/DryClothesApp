import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as BackgroundFetch from "expo-background-fetch";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";

import { fetchOpenMeteo, parseWeather } from "./api";
import { scoreLabel } from "./score";
import { ALERT_LEAD_MINUTES, BG_TASK, STORAGE_KEYS } from "./constants";

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

export async function scheduleSmartRainAlert(rainEtaIso, city, rainChance) {
  if (!isNative) return null;

  await Notifications.cancelScheduledNotificationAsync(ID_RAIN).catch(() => {});
  if (!rainEtaIso) return null;

  const rainTime  = new Date(rainEtaIso).getTime();
  const alertTime = new Date(rainTime - ALERT_LEAD_MINUTES * 60 * 1000);

  if (alertTime.getTime() <= Date.now()) {
    // Only fire once per rain event — avoid spamming on every app open
    const lastEta = await AsyncStorage.getItem(STORAGE_KEYS.lastRainNotifEta);
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
    await AsyncStorage.setItem(STORAGE_KEYS.lastRainNotifEta, rainEtaIso);
    return "immediate";
  }

  await Notifications.scheduleNotificationAsync({
    identifier: ID_RAIN,
    content: {
      title: "☔ Rain coming in 45 minutes!",
      body:  `${rainChance}% chance. Time to bring clothes inside in ${city}!`,
      sound: true,
      badge: 1,
      data:  { type: "rain_warning", eta: rainEtaIso },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alertTime, channelId: "rain-alerts" },
  });

  await AsyncStorage.setItem(STORAGE_KEYS.lastAlertTime, alertTime.toISOString());
  return alertTime;
}

export async function scheduleSunsetAlert(sunsetIso, city) {
  if (!isNative) return;

  await Notifications.cancelScheduledNotificationAsync(ID_SUNSET).catch(() => {});
  if (!sunsetIso) return;

  const sunsetTime = new Date(sunsetIso).getTime();
  if (sunsetTime <= Date.now()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: ID_SUNSET,
    content: {
      title: "🌅 Sun has set!",
      body:  `It's sunset in ${city}. Bring your clothes inside before they get damp!`,
      sound: true,
      badge: 1,
      data:  { type: "sunset" },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(sunsetIso), channelId: "rain-alerts" },
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
      const alertEnabled = await AsyncStorage.getItem(STORAGE_KEYS.alertEnabled);
      if (alertEnabled !== "true") return BackgroundFetch.BackgroundFetchResult.NoData;

      const coordsStr = await AsyncStorage.getItem(STORAGE_KEYS.cachedCoords);
      if (!coordsStr) return BackgroundFetch.BackgroundFetchResult.NoData;

      const { lat, lon, city } = JSON.parse(coordsStr);
      const weather = parseWeather(await fetchOpenMeteo(lat, lon));

      await AsyncStorage.setItem(STORAGE_KEYS.cachedWeather, JSON.stringify({
        score:      weather.score,
        rainChance: weather.rainChance,
        condition:  weather.condition,
        temp:       weather.temp,
        city,
        updatedAt:  new Date().toISOString(),
      }));

      if (weather.rainEtaIso) {
        await scheduleSmartRainAlert(weather.rainEtaIso, city, weather.rainChance);
      } else {
        await Notifications.cancelScheduledNotificationAsync(ID_RAIN).catch(() => {});
      }
      await scheduleSunsetAlert(weather.sunsetIso, city);
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
