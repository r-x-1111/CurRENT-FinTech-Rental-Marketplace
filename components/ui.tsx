import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../constants/theme";
import { useMarketplace } from "../context/Marketplace";
export { colors } from "../constants/theme";
export { MediaPicker } from "./MediaPicker";

export function Screen({
  children,
  title,
  subtitle,
  back,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  back?: boolean;
  action?: React.ReactNode;
}) {
  const { storageError } = useMarketplace();
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
      >
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
              <Text style={s.title}>{title}</Text>
              {subtitle && <Text style={s.caption}>{subtitle}</Text>}
            </View>
            {action}
          </View>
        )}
        {!!storageError && <Notice text={storageError} error />}
        {children}
      </ScrollView>
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
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  danger?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && { backgroundColor: "#FFF0ED", borderColor: "#FFCCC2" },
        (disabled || pressed) && { opacity: 0.55 },
      ]}
    >
      <Text
        style={[
          s.buttonText,
          secondary && { color: colors.navy },
          danger && { color: colors.danger },
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
export function Section({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.section}>
      <Text style={s.h2}>{title}</Text>
      {action && (
        <Pressable accessibilityRole="button" onPress={onPress}>
          <Text style={s.link}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7, marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#929BAA"
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 94, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Badge({
  text,
  green = false,
}: {
  text: string;
  green?: boolean;
}) {
  return (
    <View
      style={[
        s.badge,
        green && { backgroundColor: "#E7F6EC", borderColor: "#A7F3D0" },
      ]}
    >
      <Text style={[s.badgeText, green && { color: colors.green }]}>
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
}: {
  title: string;
  text: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.empty}>
      <Ionicons name="sparkles-outline" size={32} color={colors.blue} />
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
}: {
  options: readonly string[] | string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingBottom: 14 }}
    >
      {options.map((option) => (
        <Pressable
          key={option}
          accessibilityRole="button"
          accessibilityState={{ selected: option === selected }}
          onPress={() => onSelect(option)}
          style={[
            s.chip,
            option === selected && {
              backgroundColor: colors.blue,
              borderColor: colors.blue,
            },
          ]}
        >
          <Text style={[s.label, option === selected && { color: "white" }]}>
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
  content: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    padding: 22,
    paddingBottom: 44,
  },
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
    marginBottom: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -1,
  },
  h2: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.navy,
    letterSpacing: -0.4,
  },
  caption: { fontSize: 14, lineHeight: 22, color: colors.muted, marginTop: 4 },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  bold: { fontWeight: "800", color: colors.navy },
  link: { fontSize: 13, color: colors.linkBlue, fontWeight: "700" },
  button: {
    minHeight: 48,
    backgroundColor: colors.blue,
    borderColor: colors.blue,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  secondary: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 },
  buttonText: { fontSize: 14, color: "white", fontWeight: "700" },
  card: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
    marginBottom: 16,
  },
  section: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: "600", color: colors.navy },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  notice: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 12,
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: "white",
  },
  split: { flexDirection: "row", flexWrap: "wrap", gap: 20 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 9 },
});
