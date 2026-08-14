import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Easing, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "../theme/theme";

// Shown while a sleeping free-tier server boots. The elapsed counter is the
// point: without it a 45-second wait is indistinguishable from a hang.
export function WakingScreen({ elapsedSec, onSkip, showSkip }) {
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <View style={S.center}>
      <StatusBar barStyle={t.statusBarStyle === "light" ? "light-content" : "dark-content"} />

      <Animated.Text style={{ fontSize: 64, transform: [{ scale }] }}>☁️</Animated.Text>
      <Text style={S.title}>Waking up the server</Text>
      <ActivityIndicator style={{ marginTop: 16 }} color={t.accentGreen} size="small" />
      <Text style={S.elapsed}>{elapsedSec}s</Text>

      <View style={S.notice}>
        <Text style={S.noticeTitle}>⏳ This only happens after a quiet spell</Text>
        <Text style={S.noticeBody}>
          Your settings, saved locations and forecasts live on a free-tier server that
          sleeps when idle. It usually takes 30–60 seconds to start back up, then the
          app opens instantly for the rest of the day.
        </Text>
      </View>

      {showSkip && (
        <TouchableOpacity onPress={onSkip} style={S.ghostBtn} activeOpacity={0.75}>
          <Text style={S.ghostBtnTxt}>Continue without waiting</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Terminal state after the wake-up window expires. The native Alert fired by
// BackendGate carries the same two choices; this screen is what sits behind it.
export function BackendUnreachableScreen({ onRetry, onSkip }) {
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={S.center}>
      <StatusBar barStyle={t.statusBarStyle === "light" ? "light-content" : "dark-content"} />

      <Text style={{ fontSize: 56 }}>🔌</Text>
      <Text style={S.title}>Server not responding</Text>
      <Text style={S.body}>
        The app could not reach its server, so nothing you change will be saved.
      </Text>

      <View style={S.notice}>
        <Text style={S.noticeTitle}>You can still use the app</Text>
        <Text style={S.noticeBody}>
          Weather comes straight from Open-Meteo, so the forecast and drying score
          work either way. Settings and saved locations just won&apos;t stick until
          the server is back.
        </Text>
      </View>

      <TouchableOpacity onPress={onRetry} style={S.btn} activeOpacity={0.8}>
        <Text style={S.btnTxt}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkip} style={S.ghostBtn} activeOpacity={0.75}>
        <Text style={S.ghostBtnTxt}>Continue anyway</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    center: { flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", padding: 32 },

    title:   { color: t.textPrimary, fontSize: 22, fontWeight: "800", marginTop: 16, textAlign: "center" },
    body:    { color: t.textSecondary, fontSize: 15, marginTop: 10, textAlign: "center", lineHeight: 22 },
    elapsed: { color: t.textMuted, fontSize: 13, marginTop: 10, fontVariant: ["tabular-nums"] },

    notice:      { backgroundColor: t.alertBannerBg, borderColor: t.alertBannerBorder, borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 26 },
    noticeTitle: { color: t.alertBannerText, fontSize: 13, fontWeight: "800", marginBottom: 6 },
    noticeBody:  { color: t.textSecondary, fontSize: 13, lineHeight: 19 },

    btn:    { marginTop: 26, backgroundColor: t.accentGreen, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 14 },
    btnTxt: { color: t.accentGreenText, fontWeight: "900", fontSize: 16 },

    ghostBtn:    { marginTop: 14, paddingHorizontal: 20, paddingVertical: 10 },
    ghostBtnTxt: { color: t.textMuted, fontWeight: "700", fontSize: 13 },
  });
}
