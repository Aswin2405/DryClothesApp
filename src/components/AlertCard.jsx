import { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Switch, Text, View } from "react-native";

import { useTheme } from "../theme/theme";

export function AlertCard({ alertEnabled, onToggle, nextAlert, loading, leadMinutes }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);

  useEffect(() => {
    if (!alertEnabled) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [alertEnabled]);

  let timeText = "No rain in next 12 hours ✅";
  if (nextAlert === "immediate") {
    timeText = "🚨 Rain arriving NOW — alert sent!";
  } else if (nextAlert instanceof Date) {
    const hrs  = nextAlert.getHours();
    const mins = String(nextAlert.getMinutes()).padStart(2, "0");
    const ap   = hrs >= 12 ? "PM" : "AM";
    const h12  = hrs > 12 ? hrs - 12 : hrs === 0 ? 12 : hrs;
    timeText = `Alert scheduled for ${h12}:${mins} ${ap}`;
  }

  return (
    <View style={S.card}>
      <View style={S.header}>
        <View style={{ flex: 1 }}>
          <Text style={S.title}>🔔 Smart Rain Alert</Text>
          <Text style={S.sub}>Fires {leadMinutes} min before rain</Text>
        </View>
        <Switch
          value={alertEnabled}
          onValueChange={onToggle}
          trackColor={{ false: t.track, true: t.accentGreen }}
          thumbColor="#fff"
          ios_backgroundColor={t.track}
        />
      </View>

      {alertEnabled && (
        <Animated.View style={[S.statusBox, { transform: [{ scale: pulseAnim }] }]}>
          {loading
            ? <ActivityIndicator color={t.accentGreen} size="small" />
            : <Text style={S.statusText}>{timeText}</Text>
          }
        </Animated.View>
      )}

      {alertEnabled && (
        <Text style={S.note}>
          Background check runs every 30 min • auto-updates when weather changes
        </Text>
      )}
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    card:       { backgroundColor: t.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.accentGreen + "40" },
    header:     { flexDirection: "row", alignItems: "center" },
    title:      { fontSize: 15, fontWeight: "800", color: t.textPrimary },
    sub:        { fontSize: 11, color: t.textMuted, marginTop: 2 },
    statusBox:  { marginTop: 10, backgroundColor: t.accentGreen + "1f", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: t.accentGreen + "40" },
    statusText: { color: t.accentGreen, fontSize: 13, fontWeight: "600", textAlign: "center" },
    note:       { fontSize: 10, color: t.textFaint, textAlign: "center", marginTop: 8 },
  });
}
