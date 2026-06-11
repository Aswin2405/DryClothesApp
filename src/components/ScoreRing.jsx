import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { scoreLabel } from "../weather/score";

export function ScoreRing({ score }) {
  const anim = useRef(new Animated.Value(0)).current;
  const sl   = scoreLabel(score);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [score]);

  return (
    <View style={S.container}>
      <View style={[S.ringOuter, { borderColor: sl.color + "44" }]}>
        <View style={[S.ringInner, { borderColor: sl.color }]}>
          <Text style={[S.number, { color: sl.color }]}>{score}</Text>
          <Text style={S.of}>/100</Text>
        </View>
      </View>
      <View style={S.labelRow}>
        <Text style={S.labelEmoji}>{sl.emoji}</Text>
        <Text style={[S.labelText, { color: sl.color }]}>{sl.text}</Text>
      </View>
      <Text style={S.caption}>Drying Score</Text>
    </View>
  );
}

const S = StyleSheet.create({
  container:  { alignItems: "center" },
  ringOuter:  { width: 100, height: 100, borderRadius: 50,  borderWidth: 6,   alignItems: "center", justifyContent: "center" },
  ringInner:  { width: 82,  height: 82,  borderRadius: 41,  borderWidth: 3,   alignItems: "center", justifyContent: "center" },
  number:     { fontSize: 28, fontWeight: "900", lineHeight: 30 },
  of:         { fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: -2 },
  labelRow:   { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  labelEmoji: { fontSize: 13 },
  labelText:  { fontSize: 12, fontWeight: "700" },
  caption:    { fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 },
});
