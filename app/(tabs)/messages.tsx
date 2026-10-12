import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Empty, Screen, s } from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { colors } from "../../constants/theme";

export default function MessagesScreen() {
  const { state, user } = useMarketplace();

  if (!user) {
    return <Redirect href="/auth" />;
  }

  const conversations = state.bookings
    .filter(
      (booking) =>
        booking.ownerId === user.id || booking.renterId === user.id,
    )
    .map((booking) => {
      const messages = state.messages
        .filter((message) => message.bookingId === booking.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      const otherUserId =
        booking.ownerId === user.id ? booking.renterId : booking.ownerId;
      const other = state.profiles.find(
        (profile) => profile.id === otherUserId,
      );
      const unreadCount = state.notifications.filter(
        (notice) =>
          notice.userId === user.id &&
          notice.bookingId === booking.id &&
          !notice.read &&
          notice.title.includes("sent you a message"),
      ).length;

      return { booking, latestMessage: messages[0], other, unreadCount };
    })
    .sort((a, b) => {
      const aDate = a.latestMessage?.createdAt || a.booking.createdAt;
      const bDate = b.latestMessage?.createdAt || b.booking.createdAt;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  return (
    <Screen title="Messages" subtitle="Conversations about your rentals.">
      {conversations.length ? (
        <View style={styles.list}>
          {conversations.map(({ booking, latestMessage, other, unreadCount }) => (
            <Pressable
              key={booking.id}
              accessibilityRole="button"
              accessibilityLabel={`Open conversation with ${other?.name || "rental participant"} about ${booking.title}`}
              onPress={() => router.push(`/conversation/${booking.id}`)}
              style={({ pressed }) => [
                styles.conversation,
                pressed && { opacity: 0.65 },
              ]}
            >
              {other?.avatar ? (
                <Image source={{ uri: other.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person-outline"
                    size={22}
                    color={colors.blue}
                  />
                </View>
              )}
              <View style={styles.details}>
                <View style={styles.titleRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {other?.name || "Rental participant"}
                  </Text>
                  {!!unreadCount && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.bookingTitle} numberOfLines={1}>
                  {booking.title}
                </Text>
                <Text style={s.caption} numberOfLines={1}>
                  {latestMessage?.text || "Start a conversation"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.muted}
              />
            </Pressable>
          ))}
        </View>
      ) : (
        <Empty
          title="No messages yet"
          text="Once you have a rental, you can message the other participant here."
          action="View rentals"
          onPress={() => router.push("/(tabs)/rentals")}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
    marginTop: 8,
  },
  conversation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.softBlue,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    color: colors.navy,
    fontSize: 15,
    fontWeight: "700",
  },
  bookingTitle: {
    color: colors.slate,
    fontSize: 13,
    fontWeight: "600",
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
});
