import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MarketplaceProvider } from "../context/Marketplace";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MarketplaceProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="listing/[id]" />
          <Stack.Screen name="owner/index" />
          <Stack.Screen name="help" />
          <Stack.Screen name="support/customer-service" />
        </Stack>
      </MarketplaceProvider>
    </SafeAreaProvider>
  );
}
