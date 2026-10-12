import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Badge, Button, Empty, Screen, s } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { fetchChatInbox, type SharedConversation, type SharedMessage } from "../services/chat";
export default function Notifications() {
  const { state, user, act } = useMarketplace();
  const [chatUpdates, setChatUpdates] = useState<{ chat: SharedConversation; message: SharedMessage }[]>([]);
  useEffect(() => {
    if (!user || state.mode === "admin_demo") return;
    void fetchChatInbox().then(({ conversations, messages }) => {
      setChatUpdates(messages.filter((message) => message.receiver_id === user.id && !message.read_at)
        .map((message) => ({ chat: conversations.find((chat) => chat.id === message.conversation_id)!, message }))
        .filter((item) => !!item.chat));
    }).catch(() => {});
  }, [user?.id, state.mode]);
  const notices = state.notifications.filter((n) => n.userId === user?.id);
  return (
    <Screen
      back
      title="Your updates"
      subtitle="The little things that keep your rentals moving."
    >
      {chatUpdates.map(({ chat, message }) => <Pressable key={message.id} accessibilityRole="button"
        onPress={() => router.push({ pathname: "/(tabs)/messages", params: { chatId: chat.id } })}
        style={[s.card, { marginTop: 14 }]}>
        <Badge text="New message" /><Text style={s.body}>{chat.chat_listings?.listing_data.title || "Listing conversation"}</Text>
        <Text style={s.caption}>{message.body || "Photo"}</Text>
      </Pressable>)}
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
          return n.conversationId ? (
            <Pressable key={n.id} accessibilityRole="button" onPress={() => router.push({ pathname: "/(tabs)/messages", params: { chatId: n.conversationId } })} style={[s.card, { marginTop: 14 }]}>{content}</Pressable>
          ) : n.bookingId ? (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              onPress={() => n.title.includes("sent you a message")
                ? router.push({ pathname: "/(tabs)/messages", params: { bookingId: n.bookingId } })
                : router.push(`/rental/${n.bookingId}`)}
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
