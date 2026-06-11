import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Switch, Text, View } from "react-native";

import { ALERT_LEAD_MINUTES } from "../weather/constants";

export function AlertCard({ alertEnabled, onToggle, nextAlert, loading }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

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
          <Text style={S.sub}>Fires {ALERT_LEAD_MINUTES} min before rain</Text>
        </View>
        <Switch
          value={alertEnabled}
          onValueChange={onToggle}
          trackColor={{ false: "rgba(255,255,255,0.15)", true: "#44dd88" }}
          thumbColor="#fff"
          ios_backgroundColor="rgba(255,255,255,0.15)"
        />
      </View>

      {alertEnabled && (
        <Animated.View style={[S.statusBox, { transform: [{ scale: pulseAnim }] }]}>
          {loading
            ? <ActivityIndicator color="#44dd88" size="small" />
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

const S = StyleSheet.create({
  card:       { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(68,221,136,0.25)" },
  header:     { flexDirection: "row", alignItems: "center" },
  title:      { fontSize: 15, fontWeight: "800", color: "#fff" },
  sub:        { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  statusBox:  { marginTop: 10, backgroundColor: "rgba(68,221,136,0.12)", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "rgba(68,221,136,0.25)" },
  statusText: { color: "#44dd88", fontSize: 13, fontWeight: "600", textAlign: "center" },
  note:       { fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 8 },
});
