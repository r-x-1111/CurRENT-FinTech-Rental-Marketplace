import { useState } from "react";
import { Pressable, ScrollView, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MALAYSIAN_STATES } from "../constants/categories";
import { colors } from "../constants/theme";
import { s } from "./ui";

export function MalaysiaStateSelector({ value, onChange, label = "State / Federal Territory", labelStyle, inputStyle, valueStyle }: {
  value: string; onChange: (value: string) => void; label?: string;
  labelStyle?: StyleProp<TextStyle>; inputStyle?: StyleProp<ViewStyle>; valueStyle?: StyleProp<TextStyle>;
}) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 7, marginBottom: 14 }}>
    <Text style={labelStyle || s.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Select ${label}`}
      onPress={() => setOpen((current) => !current)}
      style={[inputStyle || s.input, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
      <Text style={[{ color: value ? colors.navy : colors.muted }, valueStyle || { fontSize: 15 }]}>{value || "Select a state or federal territory"}</Text>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.blue} />
    </Pressable>
    {open && <ScrollView nestedScrollEnabled style={{ maxHeight: 208, backgroundColor: colors.white,
      borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
      {MALAYSIAN_STATES.map((state) => <Pressable key={state} accessibilityRole="button"
        accessibilityState={{ selected: value === state }}
        onPress={() => { onChange(state); setOpen(false); }}
        style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: value === state ? colors.paleBlue : colors.white }}>
        <Text style={{ color: value === state ? colors.blue : colors.navy, fontWeight: value === state ? "700" : "400" }}>{state}</Text>
      </Pressable>)}
    </ScrollView>}
  </View>;
}
