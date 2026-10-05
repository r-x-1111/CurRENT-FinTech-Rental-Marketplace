import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Empty, Field, Notice, Screen, s } from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { colors } from "../../constants/theme";
export default function Conversation() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user, act } = useMarketplace();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const b = state.bookings.find(
    (b) => b.id === id && [b.ownerId, b.renterId].includes(user?.id || ""),
  );
  const unreadMessages = state.notifications.filter(
    (notice) =>
      notice.userId === user?.id &&
      notice.bookingId === id &&
      !notice.read &&
      notice.title.includes("sent you a message"),
  ).length;
  useEffect(() => {
    if (b && unreadMessages) act({ type: "readConversation", bookingId: b.id });
  }, [b?.id, unreadMessages, user?.id]);
  if (!b)
    return (
      <Screen back>
        <Empty
          title="Conversation unavailable"
          text="Only rental participants can access this conversation."
        />
      </Screen>
    );
  const other = state.profiles.find(
    (p) => p.id === (b.ownerId === user?.id ? b.renterId : b.ownerId),
  );
  function send() {
    try {
      act({ type: "message", bookingId: id, text });
      setText("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Screen back title={other?.name} subtitle={b.title}>
      <Button secondary onPress={() => router.push(`/rental/${id}`)}>
        View rental
      </Button>
      <Notice text="Messages are saved on this device. Use Profile → Demo accounts to reply as the other participant." />
      <View style={{ gap: 12, marginVertical: 18 }}>
        {state.messages
          .filter((m) => m.bookingId === id)
          .map((m) => (
            <View
              key={m.id}
              style={{
                alignSelf: m.authorId === user?.id ? "flex-end" : "flex-start",
                maxWidth: "85%",
                backgroundColor:
                  m.authorId === user?.id ? colors.softBlue : "white",
                padding: 16,
                borderRadius: 16,
              }}
            >
              <Text style={s.body}>{m.text}</Text>
              <Text style={[s.caption, { fontSize: 10 }]}>
                {state.profiles.find((p) => p.id === m.authorId)?.name} ·{" "}
                {new Date(m.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ))}
      </View>
      {!!error && <Notice text={error} error />}
      <Field
        label="Message"
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        placeholder="Ask about pickup, accessories or the return…"
      />
      <Button disabled={!text.trim()} onPress={send}>
        Send message
      </Button>
    </Screen>
  );
}
