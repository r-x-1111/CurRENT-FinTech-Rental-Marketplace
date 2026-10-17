import { useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../constants/theme";

/**
 * "Magnetic Glow" hover micro-interaction (desktop web only — native touch devices get a
 * plain press response since there's no hover/cursor to follow there). Moves the element a
 * few pixels toward the mouse position within it and adds a soft blue glow + slight lift.
 * Only wraps children; never changes layout of surrounding content (position: relative,
 * transform-only movement, so siblings never shift).
 */
export function MagneticGlow({
  children,
  onPress,
  style,
  strength = 8,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Max pixels the element shifts toward the cursor. Keep small/subtle. */
  strength?: number;
  accessibilityLabel?: string;
}) {
  const translate = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lift = useRef(new Animated.Value(0)).current;
  const sizeRef = useRef({ width: 1, height: 1 });

  if (Platform.OS !== "web") {
    // Native touch: no cursor to follow — fall back to a simple, unanimated press.
    return (
      <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={accessibilityLabel} onPress={onPress} style={style}>
        {children}
      </Pressable>
    );
  }

  function handleMove(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent;
    const { width, height } = sizeRef.current;
    const dx = (locationX / Math.max(width, 1) - 0.5) * 2 * strength;
    const dy = (locationY / Math.max(height, 1) - 0.5) * 2 * strength;
    translate.setValue({ x: dx, y: dy });
  }

  function handleEnter() {
    Animated.spring(lift, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }

  function handleLeave() {
    Animated.spring(lift, { toValue: 0, friction: 6, tension: 120, useNativeDriver: true }).start();
    Animated.spring(translate, { toValue: { x: 0, y: 0 }, friction: 6, tension: 120, useNativeDriver: true }).start();
  }

  const scale = lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const shadowOpacity = lift.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <Animated.View
      // @ts-expect-error — web-only pointer events, valid under react-native-web
      onMouseEnter={handleEnter}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onLayout={(e) => { sizeRef.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }; }}
      style={[
        styles.base,
        {
          transform: [{ translateX: translate.x }, { translateY: translate.y }, { scale }],
          shadowColor: colors.blue,
          shadowOpacity,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
        },
      ]}
    >
      <Pressable accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={accessibilityLabel} onPress={onPress} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: "flex-start" },
});
