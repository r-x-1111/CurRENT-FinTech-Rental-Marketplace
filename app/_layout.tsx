import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MarketplaceProvider } from "../context/Marketplace";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export default function RootLayout() {
  const [iconsLoaded, iconError] = useFonts(Ionicons.font);
  if (!iconsLoaded && !iconError) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F7F4" }}>
      <Text style={{ color: "#0B1F3A", fontSize: 24, fontWeight: "800" }}>CurRENT</Text>
    </View>;
  }
  return (
    <SafeAreaProvider>
      <MarketplaceProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen name="delivery-demo/[id]" />
          <Stack.Screen name="delivery-receipt/[id]" />
          <Stack.Screen name="delivery-history" />
          <Stack.Screen name="dispute/[id]" />
          <Stack.Screen name="owner/index" />
          <Stack.Screen name="admin/listings" />
          <Stack.Screen name="help" />
          <Stack.Screen name="what-you-should-know" />
          <Stack.Screen name="risk-score-history" />
          <Stack.Screen name="rental-risk-score" />
          <Stack.Screen name="support/customer-service" />
        </Stack>
      </MarketplaceProvider>
    </SafeAreaProvider>
  );
}
