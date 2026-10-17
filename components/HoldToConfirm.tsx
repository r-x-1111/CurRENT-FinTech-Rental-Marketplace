import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

/**
 * "Hold to Confirm" micro-interaction: press and hold to fill a horizontal progress bar
 * over ~1.2s; the action fires only once the bar reaches 100%. Releasing early smoothly
 * reverses the fill. This is purely a UI gate in front of `onConfirm` — it never changes
 * what `onConfirm` does, so existing payment/escrow/deposit business logic is untouched.
 *
 * Accessibility: holding a button is impractical for keyboard and many screen-reader users,
 * so a plain-text "Confirm without holding" link next to the bar triggers the same
 * `onConfirm` instantly — a first-class alternative, not an afterthought.
 */
export function HoldToConfirmButton({
  label,
  holdingLabel = "Keep holding…",
  onConfirm,
  durationMs = 1200,
  disabled,
}: {
  label: string;
  holdingLabel?: string;
  onConfirm: () => void;
  durationMs?: number;
  disabled?: boolean;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const fired = useRef(false);
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => () => { anim.current?.stop(); }, []);

  function start() {
    if (disabled || done) return;
    fired.current = false;
    setHolding(true);
    progress.setValue(0);
    anim.current = Animated.timing(progress, { toValue: 1, duration: durationMs, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished && !fired.current) {
        fired.current = true;
        setDone(true);
        onConfirm();
      }
    });
  }

  function cancel() {
    if (fired.current) return;
    setHolding(false);
    anim.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: false }).start();
  }

  const widthPct = progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Press and hold to confirm"
        disabled={disabled || done}
        onPressIn={start}
        onPressOut={cancel}
        style={[styles.track, (disabled || done) && { opacity: 0.6 }]}
      >
        <Animated.View style={[styles.fill, { width: widthPct }]} />
        <View style={styles.labelRow}>
          {done && <Ionicons name="checkmark-circle" size={16} color={colors.white} />}
          <Text style={styles.labelText}>{done ? "Confirmed" : holding ? holdingLabel : label}</Text>
        </View>
      </Pressable>
      {!done && (
        <Pressable accessibilityRole="button" onPress={onConfirm} disabled={disabled} hitSlop={6}>
          <Text style={[styles.altLink, disabled && { opacity: 0.5 }]}>Can't hold? Confirm without holding</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.mediumBlue,
    overflow: "hidden",
    justifyContent: "center",
  },
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.blue,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  labelText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  altLink: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
