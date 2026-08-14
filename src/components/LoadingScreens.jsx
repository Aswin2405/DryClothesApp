import { useMemo } from "react";
import { Animated, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "../theme/theme";

export function LocationPermScreen({ onRetry }) {
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={S.center}>
      <StatusBar barStyle={t.statusBarStyle === "light" ? "light-content" : "dark-content"} />
      <Text style={{ fontSize: 64 }}>📍</Text>
      <Text style={S.title}>Location Access Needed</Text>
      <Text style={S.body}>
        This app needs your location to show real-time weather and drying conditions where you are.
      </Text>
      <TouchableOpacity onPress={onRetry} style={S.btn}>
        <Text style={S.btnTxt}>Allow Location</Text>
      </TouchableOpacity>
    </View>
  );
}

export function ErrorScreen({ message, onRetry }) {
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={S.center}>
      <StatusBar barStyle={t.statusBarStyle === "light" ? "light-content" : "dark-content"} />
      <Text style={{ fontSize: 56 }}>😵</Text>
      <Text style={S.title}>Something went wrong</Text>
      <Text style={[S.body, { color: t.textSecondary }]}>{message}</Text>
      <TouchableOpacity onPress={onRetry} style={S.btn}>
        <Text style={S.btnTxt}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const PHASE_MSGS = {
  init:     "Starting up…",
  locating: "Finding your location…",
  loading:  "Loading weather…",
};

export function LoadingScreen({ phase, spinAnim, city }) {
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <View style={S.center}>
      <StatusBar barStyle={t.statusBarStyle === "light" ? "light-content" : "dark-content"} />
      <Animated.Text style={{ fontSize: 64, transform: [{ rotate: spin }] }}>⛅</Animated.Text>
      <Text style={S.loadingMsg}>{PHASE_MSGS[phase] || "Loading…"}</Text>
      {!!city && city !== "Detecting…" && (
        <Text style={S.loadingCity}>{city}</Text>
      )}
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    center:      { flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 32 },
    title:       { color: t.textPrimary, fontSize: 22, fontWeight: "800", marginTop: 16, textAlign: "center" },
    body:        { color: t.textSecondary, fontSize: 15, marginTop: 10, textAlign: "center", lineHeight: 22 },
    btn:         { marginTop: 28, backgroundColor: t.accentGreen, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
    btnTxt:      { color: t.accentGreenText, fontWeight: "900", fontSize: 16 },
    loadingMsg:  { color: t.textPrimary, marginTop: 18, fontSize: 16, fontWeight: "600" },
    loadingCity: { color: t.textMuted, marginTop: 6, fontSize: 13 },
  });
}
