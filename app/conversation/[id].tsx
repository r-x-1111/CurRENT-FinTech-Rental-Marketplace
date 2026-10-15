import { Redirect, useLocalSearchParams } from "expo-router";

// Keep older rental links working through the shared Messages inbox.
export default function ConversationRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: "/(tabs)/messages", params: { bookingId: id } }} />;
}
