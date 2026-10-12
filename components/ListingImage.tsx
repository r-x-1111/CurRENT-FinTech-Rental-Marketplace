import { useState } from "react";
import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";

export function ListingImage({
  uri,
  style,
  iconSize = 34,
}: {
  uri?: string | null;
  style: StyleProp<ImageStyle>;
  iconSize?: number;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const hasImage = Boolean(uri?.trim()) && failedUri !== uri;

  if (!hasImage) {
    return (
      <View
        accessibilityLabel="Listing image unavailable"
        style={[style, styles.placeholder]}
      >
        <Ionicons name="image-outline" size={iconSize} color={colors.muted} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: uri! }}
      onError={() => setFailedUri(uri || "")}
      style={style}
      resizeMode="cover"
      accessibilityLabel="Listing photo"
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lightGrey,
  },
});
