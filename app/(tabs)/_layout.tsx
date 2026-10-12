import { Tabs } from "expo-router";
import { Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../constants/theme";
import { useMarketplace } from "../../context/Marketplace";
const icons = {
  index: "home-outline",
  rentals: "bag-handle-outline",
  profile: "person-circle-outline",
  messages: "chatbubbles-outline",
} as const;
export default function TabsLayout() {
  const { user } = useMarketplace();
  if (!user) return <Redirect href="/auth" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          minHeight: 72,
          paddingTop: 9,
          paddingBottom: 12,
          borderTopColor: colors.border,
          backgroundColor: "white",
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={icons[route.name as keyof typeof icons]}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages" }} />
      <Tabs.Screen name="rentals" options={{ title: "Rentals" }} />
    </Tabs>
  );
}
