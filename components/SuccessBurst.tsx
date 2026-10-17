import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "../constants/theme";

const PARTICLE_COLORS = [colors.blue, colors.softBlue, colors.white, colors.paleBlue, colors.blue, colors.softBlue];
const PARTICLE_COUNT = 6;

/**
 * Success Particle Burst: a small, professional (not confetti-like) burst of 6 dots in
 * CurRENT's blue/light-blue/white palette, fired once whenever `trigger` flips to a new
 * truthy value — e.g. after a booking, payment, listing submission or review succeeds.
 * Purely decorative: it overlays near the triggering button/icon and never blocks input.
 */
export function SuccessBurst({ trigger }: { trigger: boolean | number | string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const lastTrigger = useRef(trigger);

  useEffect(() => {
    if (!trigger || lastTrigger.current === trigger) return;
    lastTrigger.current = trigger;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 550, useNativeDriver: true }).start();
  }, [trigger, progress]);

  if (!trigger) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        const distance = 26;
        const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * distance] });
        const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * distance] });
        const opacity = progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] });
        const scale = progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.5] });
        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              { backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length] },
              { opacity, transform: [{ translateX }, { translateY }, { scale }] },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 0,
    height: 0,
  },
  particle: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    top: -3,
    left: -3,
    shadowColor: colors.blue,
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
});
