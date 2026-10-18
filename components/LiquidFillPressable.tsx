import { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";

/**
 * "Water drop" micro-interaction: a soft translucent ripple expands outward from the exact
 * point the user pressed and fades out, like a drop hitting water. Purely decorative feedback —
 * `onPress` fires immediately on release and is not gated on the ripple animation.
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
  /** The ripple colour (reuses existing theme colours, rendered translucent). */
  fillColor: string;
  style?: StyleProp<ViewStyle>;
  durationMs?: number;
}) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; progress: Animated.Value }[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const nextId = useRef(0);

  function handlePressIn(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent;
    const id = nextId.current++;
    const progress = new Animated.Value(0);
    setRipples((prev) => [...prev, { id, x: locationX, y: locationY, progress }]);
    Animated.timing(progress, { toValue: 1, duration: durationMs, useNativeDriver: true }).start(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    });
  }

  const maxRadius = Math.hypot(Math.max(size.width, 1), Math.max(size.height, 1));

  return (
    <Pressable
      accessibilityRole="button"
      onPressIn={handlePressIn}
      onPress={onPress}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      style={[styles.wrap, style]}
    >
      {children}
      {ripples.map(({ id, x, y, progress }) => {
        const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0, (maxRadius * 2.2) / 24] });
        const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.35, 0] });
        return (
          <Animated.View
            key={id}
            pointerEvents="none"
            style={[
              styles.circle,
              {
                left: x - 12,
                top: y - 12,
                backgroundColor: fillColor,
                opacity,
                transform: [{ scale }],
              },
            ]}
          />
        );
      })}
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
