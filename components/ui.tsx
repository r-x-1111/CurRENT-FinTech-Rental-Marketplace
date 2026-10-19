import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
/** Shared across every Pressable that uses the press-scale micro-interaction, so repeated
 * presses don't leak timers/listeners and respect the OS "reduce motion" setting. */
function usePressScale(enabled: boolean, targetScale = 0.92) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();
  const onPressIn = () => {
    if (!enabled || reduceMotion) return;
    Animated.timing(scale, { toValue: targetScale, duration: 120, useNativeDriver: true }).start();
  };
  const onPressOut = () => {
    if (!enabled || reduceMotion) return;
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
  };
  return { scale, onPressIn, onPressOut };
}

/** Polls the OS "reduce motion" accessibility setting once and keeps it live. Every animation
 * primitive in this file checks this before starting a timer/spring, per the reduced-motion rule. */
function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((value) => { if (mounted) setReduceMotion(!!value); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (value) => setReduceMotion(!!value));
    return () => { mounted = false; sub?.remove?.(); };
  }, []);
  return reduceMotion;
}
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { colors, fonts, radius, shadow, type } from "../constants/theme";
import { useMarketplace } from "../context/Marketplace";
export { colors } from "../constants/theme";
// Web-only font family (DM Sans, loaded in app/_layout.tsx); native keeps the system sans-serif
// since no local font binary is available within this restyle's file scope.
const bodyFont = Platform.select({ web: fonts.regular, default: undefined });
const boldFont = Platform.select({ web: fonts.bold, default: undefined });
export { MediaPicker } from "./MediaPicker";

export function Screen({
  children,
  title,
  subtitle,
  back,
  action,
  scrollToY,
  scrollRequestId,
  contentStyle,
  bounded,
  headerGradient,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
  scrollToY?: number | null;
  scrollRequestId?: number;
  contentStyle?: StyleProp<ViewStyle>;
  bounded?: boolean;
  /** Opt-in soft light-blue gradient wash behind the header, also on desktop widths (not just mobile). */
  headerGradient?: boolean;
}) {
  const { storageError } = useMarketplace();
  const mobile = useWindowDimensions().width < 768;
  const scrollViewRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollToY !== undefined && scrollToY !== null) {
      requestAnimationFrame(() =>
        scrollViewRef.current?.scrollTo({ y: scrollToY, animated: true }),
      );
    }
  }, [scrollToY, scrollRequestId]);
  const content = <>
        {back && (
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/(tabs)")
            }
            style={s.back}
          >
            <Ionicons name="arrow-back" size={19} color={colors.blue} />
            <Text style={s.link}>Back</Text>
          </Pressable>
        )}
        {title && (
          <View style={s.heading}>
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={s.title}>{title}</Text>
              {subtitle && <Text style={s.caption}>{subtitle}</Text>}
            </View>
            {action}
          </View>
        )}
        {!!storageError && <Notice text={storageError} error />}
        {children}
      </>;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.screen}>
      {/* Shared page background: #EAF3FF fading to the flat #F7F8FA page colour over the top
          ~400px, used on every screen so the wash is consistent app-wide. */}
      <LinearGradient pointerEvents="none" colors={["#EAF3FF", colors.offWhite]} style={s.pageBgGradient} />
      {(mobile || headerGradient) && (
        <View pointerEvents="none" style={mobile ? s.mobileBackgroundCurve : s.desktopBackgroundCurve} />
      )}
      {bounded ? (
        <View style={[s.content, s.boundedContent, contentStyle]}>{content}</View>
      ) : (
        <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, contentStyle]}>{content}</ScrollView>
      )}
    </SafeAreaView>
  );
}
export function Button({
  children,
  onPress,
  secondary,
  disabled,
  danger,
  accessibilityLabel,
  loading,
  success,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  danger?: boolean;
  accessibilityLabel?: string;
  /** "Load to Check" micro-interaction: shows a spinner in place of the label. Opt-in —
   * omit for a plain button. Caller is responsible for only flipping `success` to true
   * once the underlying operation has actually succeeded. */
  loading?: boolean;
  /** Shows a brief checkmark + glow, then the caller should clear it (e.g. after ~900ms or
   * on navigation). Never shown unless the caller sets it after a real success. */
  success?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const busy = !!loading || !!disabled;
  const { scale, onPressIn, onPressOut } = usePressScale(!busy);
  const glow = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (!success) { glow.setValue(0); return; }
    if (reduceMotion) return;
    Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 180, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
  }, [success, reduceMotion, glow]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: busy, busy: !!loading }}
        disabled={busy}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed, hovered }) => [
          s.button,
          secondary && s.secondary,
          danger && { backgroundColor: "#FFF0ED", borderColor: "#FFCCC2" },
          hovered && !disabled && !danger && { backgroundColor: secondary ? colors.paleBlue : colors.mediumBlue },
          focused && !disabled && { borderColor: colors.navy, borderWidth: 2 },
          pressed && !disabled && { opacity: 0.82 },
          disabled && { opacity: 0.55 },
        ]}
      >
        <Animated.View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            shadowColor: colors.blue,
            shadowOpacity: glow,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          {loading && (
            <ActivityIndicator size="small" color={secondary ? colors.blue : colors.white} />
          )}
          {success && !loading && (
            <Ionicons name="checkmark-circle" size={16} color={secondary ? colors.green : colors.white} />
          )}
          <Text
            style={[
              s.buttonText,
              secondary && { color: colors.blue },
              danger && { color: colors.danger },
            ]}
          >
            {children}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
export function Card({
  children,
  onLayout,
  style,
}: {
  children: React.ReactNode;
  onLayout?: (event: import("react-native").LayoutChangeEvent) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.card, style]} onLayout={onLayout}>
      {children}
    </View>
  );
}
export function Section({
  title,
  action,
  onPress,
  compact,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
  compact?: boolean;
}) {
  return (
    <View style={[s.section, compact && { marginTop: 17, marginBottom: 11 }]}>
      <Text accessibilityRole="header" style={[s.h2, compact && { fontSize: 17 }]}>{title}</Text>
      {action && (
        <Pressable accessibilityRole="button" onPress={onPress}>
          <Text style={s.link}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 7, marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#929BAA"
        {...props}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        style={[
          s.input,
          props.multiline && { minHeight: 94, textAlignVertical: "top" },
          props.style,
          focused && { borderColor: colors.blue },
        ]}
      />
    </View>
  );
}
const BADGE_TONES: Record<string, { backgroundColor: string; borderColor: string; color: string }> = {
  green: { backgroundColor: "#E7F6EC", borderColor: "#A7F3D0", color: colors.green },
  red: { backgroundColor: "#FDECEC", borderColor: "#F5B5B5", color: colors.danger },
  amber: { backgroundColor: "#FEF3E2", borderColor: "#FBD9A5", color: "#B45309" },
  grey: { backgroundColor: colors.lightGrey, borderColor: colors.border, color: colors.muted },
};

export function Badge({
  text,
  green = false,
  tone,
}: {
  text: string;
  green?: boolean;
  /** Reuses existing theme colors only (green/red/amber/grey); overrides `green` when set. */
  tone?: "blue" | "green" | "red" | "amber" | "grey";
}) {
  const resolved = BADGE_TONES[tone || (green ? "green" : "")];
  return (
    <View
      style={[
        s.badge,
        resolved && { backgroundColor: resolved.backgroundColor, borderColor: resolved.borderColor },
      ]}
    >
      <Text style={[s.badgeText, resolved && { color: resolved.color }]}>
        {text.replaceAll("_", " ")}
      </Text>
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  return (
    <View
      accessibilityRole={error ? "alert" : undefined}
      style={[
        s.notice,
        error && { backgroundColor: "#FFF0ED", borderColor: "#FFCCC2" },
      ]}
    >
      <Text
        style={[
          s.caption,
          { marginTop: 0 },
          error ? { color: colors.danger } : { color: colors.navy },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}
export function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={s.row}>
      <Text style={[s.body, { flex: 1 }, strong && s.bold]}>{label}</Text>
      <Text style={[s.body, strong && s.bold]}>{value}</Text>
    </View>
  );
}
export function Empty({
  title,
  text,
  action,
  onPress,
  icon = "sparkles-outline",
}: {
  title: string;
  text: string;
  action?: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={32} color={colors.blue} />
      <Text style={s.h2}>{title}</Text>
      <Text style={[s.caption, { textAlign: "center" }]}>{text}</Text>
      {action && onPress && <Button onPress={onPress}>{action}</Button>}
    </View>
  );
}
export function Chips({
  options,
  selected,
  onSelect,
  segmented = false,
}: {
  options: readonly string[] | string[];
  selected: string;
  onSelect: (value: string) => void;
  segmented?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={segmented && s.segmentedTrack}
      contentContainerStyle={segmented ? s.segmentedContent : { gap: 8, paddingVertical: 4, paddingBottom: 14 }}
    >
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: option === selected }}
          onPress={() => onSelect(option)}
          style={[
            s.chip,
            segmented && s.segmentedChip,
            option === selected && (segmented ? s.segmentedChipSelected : {
              backgroundColor: colors.blue,
              borderColor: colors.blue,
            }),
          ]}
        >
          <Text style={[s.label, segmented && s.segmentedLabel, option === selected && { color: colors.white }]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
export function PhotoPicker({
  photos,
  onChange,
  single = false,
}: {
  photos: string[];
  onChange: (photos: string[]) => void;
  single?: boolean;
}) {
  const [error, setError] = useState("");
  async function pick() {
    try {
      setError("");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.55,
        base64: true,
        allowsMultipleSelection: !single,
        selectionLimit: single ? 1 : Math.max(1, 6 - photos.length),
      });
      if (result.canceled) return;
      const images = result.assets.map((asset) =>
        asset.base64
          ? `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`
          : asset.uri,
      );
      onChange(
        single ? images.slice(0, 1) : [...photos, ...images].slice(0, 6),
      );
    } catch {
      setError(
        "Could not open your photos. Check photo permissions and try again.",
      );
    }
  }
  return (
    <View style={{ gap: 10, marginBottom: 14 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {photos.map((photo, index) => (
          <View key={`${index}-${photo.slice(-24)}`} style={{ gap: 5 }}>
            <Image
              source={{ uri: photo }}
              style={{ width: 100, height: 90, borderRadius: 12 }}
            />
            {!single && (
              <>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    onChange([photo, ...photos.filter((_, i) => i !== index)])
                  }
                >
                  <Text style={s.link}>
                    {index === 0 ? "Main photo" : "Set as main"}
                  </Text>
                </Pressable>
                {index > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Move photo ${index + 1} earlier`}
                    onPress={() => {
                      const next = [...photos];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      onChange(next);
                    }}
                  >
                    <Text style={s.link}>Move earlier</Text>
                  </Pressable>
                )}
              </>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => onChange(photos.filter((_, i) => i !== index))}
            >
              <Text style={{ color: colors.danger, fontSize: 12 }}>
                Remove photo
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      {(single || photos.length < 6) && (
        <Button secondary onPress={pick}>
          {single && photos.length ? "Replace photo" : "Choose photo"}
        </Button>
      )}
      {!!error && <Notice text={error} error />}
    </View>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  mobileBackgroundCurve: { position: "absolute", top: 0, right: -80, width: 270, height: 220, borderBottomLeftRadius: 180, backgroundColor: colors.softBlue, opacity: 0.3 },
  pageBgGradient: { position: "absolute", top: 0, left: 0, right: 0, height: 400 },
  desktopBackgroundCurve: { position: "absolute", top: -60, right: -120, width: 420, height: 320, borderBottomLeftRadius: 320, backgroundColor: colors.softBlue, opacity: 0.25 },
  content: {
    width: "100%",
    maxWidth: 1200,
    alignSelf: "center",
    padding: 22,
    paddingBottom: 44,
  },
  boundedContent: { flex: 1, minHeight: 0, paddingBottom: 12 },
  back: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 28,
  },
  title: {
    fontSize: type.xl28 + 3,
    fontWeight: "700",
    fontFamily: boldFont,
    color: colors.navy,
    letterSpacing: -1,
    lineHeight: 38,
  },
  h2: {
    fontSize: type.lg20,
    fontWeight: "700",
    fontFamily: boldFont,
    color: colors.navy,
    letterSpacing: -0.4,
  },
  caption: { fontSize: type.sm14, lineHeight: 22, color: colors.muted, marginTop: 4, fontFamily: bodyFont },
  body: { fontSize: type.md16 - 1, lineHeight: 22, color: colors.text, fontFamily: bodyFont },
  bold: { fontWeight: "700", fontFamily: boldFont, color: colors.navy },
  link: { fontSize: type.sm14 - 1, color: colors.linkBlue, fontWeight: "700", fontFamily: boldFont },
  button: {
    minHeight: 48,
    backgroundColor: colors.blue,
    borderColor: colors.blue,
    borderWidth: 1,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    cursor: "pointer",
  },
  secondary: { backgroundColor: colors.white, borderColor: colors.blue, borderWidth: 1 },
  buttonText: { fontSize: type.sm14, color: "white", fontWeight: "700", fontFamily: boldFont, letterSpacing: 0.2 },
  card: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginBottom: 16,
    ...shadow.card,
  },
  section: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  label: { fontSize: type.sm14, fontWeight: "600", fontFamily: bodyFont, color: colors.navy },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: type.md16 - 1,
    fontFamily: bodyFont,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: colors.blue,
    fontSize: type.xs12,
    fontWeight: "700",
    fontFamily: boldFont,
    textTransform: "capitalize",
  },
  notice: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: radius.sm,
    padding: 15,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 5,
  },
  empty: {
    padding: 32,
    gap: 12,
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: "white",
  },
  segmentedTrack: { flexGrow: 0, backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  segmentedContent: { gap: 5, padding: 5 },
  segmentedChip: { backgroundColor: colors.paleBlue, borderColor: "transparent", borderRadius: radius.sm, paddingHorizontal: 15, paddingVertical: 11 },
  segmentedChipSelected: { backgroundColor: "#2463FF", borderColor: "#2463FF" },
  segmentedLabel: { color: colors.slate, fontSize: 12 },
  split: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 9 },
});
