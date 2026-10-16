import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWindowDimensions } from "react-native";
import { colors } from "../../constants/theme";
import { useMarketplace } from "../../context/Marketplace";
import { fetchChatInbox } from "../../services/chat";
import { newId } from "../../services/marketplace";
import { supabase } from "../../lib/supabase";
const icons = {
  index: "home-outline",
  rentals: "bag-handle-outline",
  messages: "chatbubble-ellipses-outline",
  profile: "person-circle-outline",
} as const;
export default function TabsLayout() {
  const mobile = useWindowDimensions().width < 768;
  const { user, state } = useMarketplace();
  const [sharedUnread, setSharedUnread] = useState(0);
  useEffect(() => {
    if (!user || state.mode === "admin_demo") { setSharedUnread(0); return; }
    const refresh = () => { void fetchChatInbox().then(({ messages }) => setSharedUnread(messages.filter((message) => message.receiver_id === user.id && !message.read_at).length)).catch(() => {}); };
    refresh();
    const timer = setInterval(refresh, 15000);
    const channel = supabase?.channel(`chat-badge-${user.id}-${newId()}`).on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, refresh).subscribe();
    return () => { clearInterval(timer); if (channel) void supabase?.removeChannel(channel); };
  }, [user?.id, state.mode]);
  const unread = sharedUnread + (user ? state.notifications.filter((notice) => notice.userId === user.id && !notice.read && notice.title.includes("sent you a message")).length : 0);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: mobile ? "#2463FF" : colors.blue,
        tabBarInactiveTintColor: mobile ? "#64789A" : colors.muted,
        tabBarStyle: {
          minHeight: mobile ? 76 : 72,
          paddingTop: mobile ? 11 : 9,
          paddingBottom: mobile ? 16 : 12,
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
      <Tabs.Screen name="rentals" options={{ title: "My Rentals" }} />
      <Tabs.Screen name="messages" options={{ title: "Messages", tabBarBadge: unread || undefined }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
