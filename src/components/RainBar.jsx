import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

export function RainBar({ pop, height = 5, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pop / 100,
      duration: 900,
      useNativeDriver: false,
      easing: Easing.out(Easing.cubic),
    }).start();
  }, [pop]);

  const color = pop >= 60 ? "#ff4455" : pop >= 30 ? "#ffaa00" : "#44dd88";

  return (
    <View style={[{ width: "100%", height, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: height / 2, overflow: "hidden", marginTop: 6 }, style]}>
      <Animated.View style={{
        height,
        borderRadius: height / 2,
        backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
      }} />
    </View>
  );
}
