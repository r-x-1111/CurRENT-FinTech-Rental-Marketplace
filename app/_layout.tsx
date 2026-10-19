import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MarketplaceProvider } from "../context/Marketplace";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { Platform, Text, View } from "react-native";

// Loads DM Sans from Google Fonts on web only (no local font binary / extra npm package is
// available in this restyle's file scope, so native platforms keep the system sans-serif).
// Weights 400/500/700 cover body/medium/heading usage; no 900 is loaded anywhere.
let webFontInjected = false;
function injectWebFontOnce() {
  if (Platform.OS !== "web" || webFontInjected || typeof document === "undefined") return;
  webFontInjected = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap";
  document.head.appendChild(link);
  const meta = document.createElement("meta");
  meta.name = "description";
  meta.content = "CurRENT — rent what you need, earn from what you own. Rentals across Malaysia.";
  document.head.appendChild(meta);
  document.title = "CurRENT — Rentals across Malaysia";
}

export default function RootLayout() {
  useEffect(() => { injectWebFontOnce(); }, []);
  const [iconsLoaded, iconError] = useFonts(Ionicons.font);
  if (!iconsLoaded && !iconError) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F7F8FA" }}>
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
