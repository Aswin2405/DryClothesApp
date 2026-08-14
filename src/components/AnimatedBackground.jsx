import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { useTheme } from "../theme/theme";

export function AnimatedBackground() {
  const pulse = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const t = useTheme();

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.05, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      Animated.timing(pulse, { toValue: 1,    duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: -10, duration: 3500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      Animated.timing(float, { toValue:  10, duration: 3500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
    ])).start();
  }, []);

  const bg   = t.bg;
  const blob = t.blob;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]}>
      <Animated.View style={[S.blob1, { backgroundColor: blob + "44", transform: [{ scale: pulse }] }]} />
      <Animated.View style={[S.blob2, { backgroundColor: blob + "2a", transform: [{ translateY: float }] }]} />
      <Animated.View style={[S.blob3, { backgroundColor: blob + "1a", transform: [{ scale: pulse }] }]} />
    </View>
  );
}

const S = StyleSheet.create({
  blob1: { position: "absolute", top: -70,   left: -50,  width: 280, height: 280, borderRadius: 140 },
  blob2: { position: "absolute", top: 100,   right: -70, width: 220, height: 220, borderRadius: 110 },
  blob3: { position: "absolute", bottom: 120, left: 10,  width: 160, height: 160, borderRadius: 80  },
});
