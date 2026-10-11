import { Pressable, Text, View } from "react-native";
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
        notices.map((n) => {
          const content = (
            <>
              {!n.read && <Badge text="New" />}
              <Text style={s.body}>{n.title}</Text>
              <Text style={s.caption}>
                {new Date(n.createdAt).toLocaleString()}
              </Text>
            </>
          );
          return n.bookingId ? (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              onPress={() => router.push(`/rental/${n.bookingId}`)}
              style={[s.card, { marginTop: 14 }]}
            >
              {content}
            </Pressable>
          ) : (
            <View key={n.id} style={[s.card, { marginTop: 14 }]}>
              {content}
            </View>
          );
        })
      ) : (
        <Empty
          title="All quiet for now"
          text="Booking updates and new messages will appear here."
        />
      )}
    </Screen>
  );
}
