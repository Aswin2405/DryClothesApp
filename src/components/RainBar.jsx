import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

import { useTheme } from "../theme/theme";

export function RainBar({ pop, height = 5, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  const t = useTheme();

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pop / 100,
      duration: 900,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [pop]);

  const color = pop >= 60 ? t.accentRed : pop >= 30 ? t.accentOrange : t.accentGreen;

  return (
    <View style={[{ width: "100%", height, backgroundColor: t.track, borderRadius: height / 2, overflow: "hidden", marginTop: 6 }, style]}>
      <Animated.View style={{
        height,
        borderRadius: height / 2,
        backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
      }} />
    </View>
  );
}
