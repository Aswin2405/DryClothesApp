/**
 * DryingWidget.js — Home-screen widget
 * Place at: src/widget/DryingWidget.js
 *
 * Uses expo-widgets (EAS Build only — does NOT run in Expo Go).
 * The main App.js writes cached weather to AsyncStorage after every fetch.
 * This widget reads that cache and shows:
 *   SmallDryingWidget  — 2×1 compact score
 *   MediumDryingWidget — 4×2 score + details
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { StyleSheet, Text, View } from "react-native";

const STORAGE_KEY = "@dryClothes:cachedWeather";

function scoreLabel(score) {
  if (score >= 75) return { text: "Excellent",  emoji: "✅", color: "#44dd88" };
  if (score >= 55) return { text: "Good",       emoji: "👍", color: "#88cc44" };
  if (score >= 35) return { text: "Risky",      emoji: "⚠️", color: "#ffaa00" };
  if (score >= 15) return { text: "Poor",       emoji: "🌦️", color: "#ff7744" };
  return              { text: "Don't Dry!",  emoji: "🚫", color: "#ff4455" };
}

// ── Small widget (2×1) ────────────────────────────────────────────────────────
export function SmallDryingWidget({ score = 0, city = "Open app", rainChance = 0 }) {
  const sl = scoreLabel(score);
  const bg = score >= 55 ? "#07422A" : score >= 35 ? "#4a2e00" : "#420707";
  return (
    <View style={[W.small, { backgroundColor: bg }]}>
      <Text style={W.smallEmoji}>{sl.emoji}</Text>
      <Text style={[W.smallScore, { color: sl.color }]}>{score}</Text>
      <Text style={W.smallScoreUnit}>/ 100</Text>
      <Text style={W.smallCity} numberOfLines={1}>{city}</Text>
      <Text style={W.smallRain}>🌧 {rainChance}%</Text>
    </View>
  );
}

// ── Medium widget (4×2) ───────────────────────────────────────────────────────
export function MediumDryingWidget({
  score = 0, city = "Open app", rainChance = 0,
  temp = "--", condition = "—", updatedAt = null,
}) {
  const sl = scoreLabel(score);
  const bg = score >= 55 ? "#07422A" : score >= 35 ? "#4a2e00" : "#420707";
  let timeStr = "";
  if (updatedAt) {
    const d = new Date(updatedAt);
    timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return (
    <View style={[W.medium, { backgroundColor: bg }]}>
      <View style={W.medLeft}>
        <View style={[W.ringOuter, { borderColor: sl.color + "44" }]}>
          <View style={[W.ringInner, { borderColor: sl.color }]}>
            <Text style={[W.ringNum, { color: sl.color }]}>{score}</Text>
          </View>
        </View>
        <Text style={[W.ringStatus, { color: sl.color }]}>{sl.emoji} {sl.text}</Text>
        <Text style={W.ringCaption}>Drying Score</Text>
      </View>
      <View style={W.medRight}>
        <View style={W.medHeaderRow}>
          <Text style={W.medCity} numberOfLines={1}>📍 {city}</Text>
          {!!timeStr && <Text style={W.medTime}>{timeStr}</Text>}
        </View>
        <Text style={W.medTemp}>{temp}°C</Text>
        <Text style={W.medCond}>{condition}</Text>
        <Text style={[W.medRain, { color: rainChance >= 60 ? "#ff4455" : rainChance >= 30 ? "#ffaa00" : "#44dd88" }]}>
          🌧️ {rainChance}% rain chance
        </Text>
        <Text style={W.medHint}>Tap to open app ↗</Text>
      </View>
    </View>
  );
}

// ── Widget Task Handler ────────────────────────────────────────────────────────
export class DryingWidgetTaskHandler {
  static async getWidgetData() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return DryingWidgetTaskHandler.defaults();
      return JSON.parse(raw);
    } catch {
      return DryingWidgetTaskHandler.defaults();
    }
  }
  static defaults() {
    return { score: 0, rainChance: 0, condition: "Open the app", temp: "--", city: "Tap to open", updatedAt: null };
  }
}

const W = StyleSheet.create({
  small: { flex: 1, borderRadius: 16, padding: 12, alignItems: "center", justifyContent: "center" },
  smallEmoji:     { fontSize: 24 },
  smallScore:     { fontSize: 30, fontWeight: "900", marginTop: 2 },
  smallScoreUnit: { fontSize: 9,  color: "rgba(255,255,255,0.38)" },
  smallCity:      { fontSize: 10, color: "rgba(255,255,255,0.58)", marginTop: 5, maxWidth: 130 },
  smallRain:      { fontSize: 11, color: "rgba(255,255,255,0.5)",  marginTop: 2 },

  medium:      { flex: 1, borderRadius: 20, padding: 14, flexDirection: "row", alignItems: "center", gap: 14 },
  medLeft:     { alignItems: "center", width: 108 },
  ringOuter:   { width: 82, height: 82, borderRadius: 41, borderWidth: 5,   alignItems: "center", justifyContent: "center" },
  ringInner:   { width: 66, height: 66, borderRadius: 33, borderWidth: 2.5, alignItems: "center", justifyContent: "center" },
  ringNum:     { fontSize: 24, fontWeight: "900" },
  ringStatus:  { fontSize: 11, fontWeight: "700", marginTop: 5 },
  ringCaption: { fontSize: 9,  color: "rgba(255,255,255,0.32)", marginTop: 1 },
  medRight:    { flex: 1 },
  medHeaderRow:{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  medCity:     { fontSize: 12, color: "rgba(255,255,255,0.72)", fontWeight: "600", flex: 1 },
  medTime:     { fontSize: 10, color: "rgba(255,255,255,0.32)" },
  medTemp:     { fontSize: 28, fontWeight: "700", color: "#fff" },
  medCond:     { fontSize: 11, color: "rgba(255,255,255,0.48)", marginTop: 1 },
  medRain:     { fontSize: 13, fontWeight: "700", marginTop: 8 },
  medHint:     { fontSize: 9,  color: "rgba(255,255,255,0.22)", marginTop: 8 },
});