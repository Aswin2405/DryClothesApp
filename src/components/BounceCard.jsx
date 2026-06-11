import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export function BounceCard({ children, delay = 0, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, delay, useNativeDriver: true, tension: 55, friction: 8 }).start();
  }, []);

  return (
    <Animated.View style={[style, {
      opacity: anim,
      transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}
