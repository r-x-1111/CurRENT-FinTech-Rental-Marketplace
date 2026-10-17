import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";

/**
 * "Liquid Fill" micro-interaction: a circular colour expansion grows outward from the exact
 * point the user pressed until it covers the container, then the action (e.g. the
 * Renter → Lender mode switch navigation) runs. Existing navigation/mode-switching logic is
 * untouched — this only delays firing `onPress` until the fill is visually complete.
 */
export function LiquidFillPressable({
  children,
  onPress,
  fillColor,
  style,
  durationMs = 480,
}: {
  children: React.ReactNode;
  onPress: () => void;
  /** The destination background colour the circle expands in (reuses existing theme colours). */
  fillColor: string;
  style?: StyleProp<ViewStyle>;
  durationMs?: number;
}) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const progress = useRef(new Animated.Value(0)).current;

  function handlePressIn(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent;
    setOrigin({ x: locationX, y: locationY });
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: durationMs, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onPress();
    });
  }

  const maxRadius = Math.hypot(Math.max(size.width, 1), Math.max(size.height, 1));
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0, (maxRadius * 2.2) / 24] });
  const opacity = progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] });

  return (
    <Pressable
      accessibilityRole="button"
      onPressIn={handlePressIn}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      style={[styles.wrap, style]}
    >
      {children}
      {origin && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.circle,
            {
              left: origin.x - 12,
              top: origin.y - 12,
              backgroundColor: fillColor,
              opacity,
              transform: [{ scale }],
            },
          ]}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" },
  circle: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
