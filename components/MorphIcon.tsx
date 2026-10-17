import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Icon Morph micro-interaction: animates a short scale + rotation flourish whenever
 * `toggleKey` changes, instead of the underlying icon just instantly swapping. Used for
 * expand/collapse chevrons, notification/filter toggles, menu open/close, password
 * visibility, etc. — anywhere an Ionicons `name` switches between two states.
 */
export function MorphIcon({
  name,
  size = 16,
  color,
  toggleKey,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color: string;
  /** Any value that changes when the icon's state toggles (e.g. the boolean/string state itself). */
  toggleKey: string | boolean;
}) {
  const morph = useRef(new Animated.Value(0)).current;
  const prevKey = useRef(toggleKey);
  useEffect(() => {
    if (prevKey.current === toggleKey) return;
    prevKey.current = toggleKey;
    morph.setValue(0);
    Animated.spring(morph, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
  }, [toggleKey, morph]);
  const scale = morph.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.22, 1] });
  const rotate = morph.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}
