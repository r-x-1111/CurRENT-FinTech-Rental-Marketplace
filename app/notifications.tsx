import { Pressable, Text } from "react-native";
import { router } from "expo-router";
import { Badge, Button, Empty, Screen, s } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
export default function Notifications() {
  const { state, user, act } = useMarketplace();
  const notices = state.notifications.filter((n) => n.userId === user?.id);
  return (
    <Screen
      back
      title="Your updates"
      subtitle="The little things that keep your rentals moving."
    >
      {!!notices.length && (
        <Button secondary onPress={() => act({ type: "readNotices" })}>
          Mark all as read
        </Button>
      )}
      {notices.length ? (
        notices.map((n) => (
          <Pressable
            key={n.id}
            accessibilityRole={n.bookingId ? "button" : undefined}
            onPress={() => {
              if (n.bookingId) router.push(`/rental/${n.bookingId}`);
            }}
            style={[s.card, { marginTop: 14 }]}
          >
            {!n.read && <Badge text="New" />}
            <Text style={s.body}>{n.title}</Text>
            <Text style={s.caption}>
              {new Date(n.createdAt).toLocaleString()}
            </Text>
          </Pressable>
        ))
      ) : (
        <Empty
          title="All quiet for now"
          text="Booking updates and new messages will appear here."
        />
      )}
    </Screen>
  );
}
