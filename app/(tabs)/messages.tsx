import { useCallback, useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Button, Empty, Notice, Screen, s } from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { colors } from "../../constants/theme";
import { formatMalaysiaDateTime, money, rentalTabForBooking } from "../../services/booking";
import { newId } from "../../services/marketplace";
import { supabase } from "../../lib/supabase";
import { fetchChatInbox, markSharedChatRead, openBookingConversation, openSharedConversation, sendSharedMessage, signedChatImage, uploadChatImage, type SharedConversation, type SharedMessage } from "../../services/chat";
import type { Listing } from "../../types";
import type { Booking } from "../../types/marketplace";
import { GuestAuthGate } from "../../components/GuestAuth";

const suggestions = ["Hi, is this item still available?", "Is the rental price negotiable?", "Where is the pickup location?", "Does the item include all accessories?"];
type Row = { id: string; kind: "shared" | "demo" | "booking"; listing: Listing; other: string; booking?: Booking; latestAt: string; preview: string; unread: number; shared?: SharedConversation };

export default function MessagesScreen() {
  const params = useLocalSearchParams<{ listingId?: string; bookingId?: string; chatId?: string }>();
  const { state, user, act, actAndPersist } = useMarketplace();
  const mobile = useWindowDimensions().width < 760;
  const [shared, setShared] = useState<SharedConversation[]>([]);
  const [remoteMessages, setRemoteMessages] = useState<SharedMessage[]>([]);
  const [selected, setSelected] = useState<string | null>(params.chatId || null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<{ uri: string; mime: string } | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [largePhoto, setLargePhoto] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const opened = useRef("");
  const lastRead = useRef("");
  const scroll = useRef<ScrollView>(null);

  const refresh = useCallback(async () => {
    if (!user || state.mode === "admin_demo") return;
    try { const data = await fetchChatInbox(); setShared(data.conversations); setRemoteMessages(data.messages); }
    catch (failure) { setError((failure as Error).message); }
  }, [user?.id, state.mode]);
  useEffect(() => {
    void refresh();
    if (!supabase || !user || state.mode === "admin_demo") return;
    const db = supabase;
    const channel = db.channel(`chat-${user.id}-${newId()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => { void refresh(); }).subscribe();
    const timer = setInterval(() => { void refresh(); }, 15000);
    return () => { clearInterval(timer); void db.removeChannel(channel); };
  }, [refresh, user?.id, state.mode]);
  useEffect(() => {
    const listingId = params.listingId;
    if (!listingId) { opened.current = ""; return; }
    if (!user || opened.current === listingId) return;
    const listing = state.listings.find((item) => item.id === listingId);
    if (!listing) { setError("Listing unavailable for messaging."); return; }
    if (listing.ownerId === user.id) { setError("You cannot message yourself."); return; }
    opened.current = listingId;
    if (state.mode === "admin_demo") { act({ type: "openChat", listingId }); return; }
    if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(listing.ownerId)) { setError("This sample owner cannot receive live messages. Choose a listing from an authenticated lender."); return; }
    void openSharedConversation(listingId, listing.ownerId, user.id, user.name)
      .then(async (chat) => { setSelected(chat.id); await refresh(); })
      .catch((failure) => setError((failure as Error).message));
  }, [params.listingId, user?.id, state.listings, state.mode]);
  useEffect(() => {
    if (state.mode !== "admin_demo" || !params.listingId || !user) return;
    const chat = state.chatConversations?.find((item) => item.listingId === params.listingId && item.renterId === user.id);
    if (chat) setSelected(chat.id);
  }, [state.chatConversations, state.mode, params.listingId, user?.id]);
  useEffect(() => {
    if (!params.bookingId || !user) return;
    const booking = state.bookings.find((item) => item.id === params.bookingId && [item.renterId, item.ownerId].includes(user.id));
    if (!booking) return;
    if (state.mode === "admin_demo") {
      const linked = state.chatConversations?.find((chat) => chat.listingId === booking.listingId && chat.renterId === booking.renterId && chat.ownerId === booking.ownerId);
      setSelected(linked?.id || `booking:${booking.id}`);
      return;
    }
    const linked = shared.find((chat) => chat.listing_id === booking.listingId && chat.renter_id === booking.renterId && chat.owner_id === booking.ownerId);
    if (linked) { setSelected(linked.id); return; }
    const renterName = state.profiles.find((profile) => profile.id === booking.renterId)?.name || "Renter";
    void openBookingConversation(booking.listingId, booking.ownerId, booking.renterId, renterName)
      .then(async (chat) => { setSelected(chat.id); await refresh(); })
      .catch((failure) => setError((failure as Error).message));
  }, [params.bookingId, shared, state.bookings, state.chatConversations, state.mode, state.profiles, user?.id]);
  useEffect(() => {
    if (params.chatId) setSelected(params.chatId);
  }, [params.chatId]);
  useEffect(() => {
    if (!params.chatId && !params.bookingId && !params.listingId) setSelected(null);
  }, [params.chatId, params.bookingId, params.listingId]);
  useEffect(() => {
    if (!selected || !user) return;
    const selectedChat = shared.find((item) => item.id === selected);
    const demoChat = state.chatConversations?.find((item) => item.id === selected);
    const linkedBooking = selectedChat && state.bookings.find((item) => item.listingId === selectedChat.listing_id && item.renterId === selectedChat.renter_id && item.ownerId === selectedChat.owner_id);
    const demoBooking = demoChat && state.bookings.find((item) => item.listingId === demoChat.listingId && item.renterId === demoChat.renterId && item.ownerId === demoChat.ownerId);
    const readKey = `${selected}:${linkedBooking?.id || demoBooking?.id || ""}`;
    if (lastRead.current === readKey && !remoteMessages.some((message) => message.conversation_id === selected && message.receiver_id === user.id && !message.read_at)) return;
    lastRead.current = readKey;
    if (state.mode === "admin_demo" && demoChat) {
      act({ type: "readChat", conversationId: selected });
      if (demoBooking) act({ type: "readConversation", bookingId: demoBooking.id });
    }
    else if (selected.startsWith("booking:")) act({ type: "readConversation", bookingId: selected.slice(8) });
    else {
      if (linkedBooking) act({ type: "readConversation", bookingId: linkedBooking.id });
      void markSharedChatRead(selected, user.id).then(refresh).catch((failure) => setError((failure as Error).message));
    }
  }, [selected, user?.id, state.mode, shared, remoteMessages]);
  useEffect(() => {
    const paths = remoteMessages.map((message) => message.image_path).filter((path): path is string => !!path && !imageUrls[path]);
    if (paths.length) void Promise.all(paths.map(async (path) => [path, await signedChatImage(path)] as const))
      .then((entries) => setImageUrls((before) => ({ ...before, ...Object.fromEntries(entries) }))).catch(() => {});
  }, [remoteMessages]);

  if (!user) return <GuestAuthGate title="Messages" returnTo="/(tabs)/messages" />;
  const rows: Row[] = [];
  for (const chat of shared) {
    const listing = chat.chat_listings?.listing_data || state.listings.find((item) => item.id === chat.listing_id);
    if (!listing) continue;
    const booking = state.bookings.find((item) => item.id === params.bookingId && item.listingId === chat.listing_id && item.renterId === chat.renter_id && item.ownerId === chat.owner_id)
      || state.bookings.find((item) => item.id === chat.booking_id && item.listingId === chat.listing_id && item.renterId === chat.renter_id && item.ownerId === chat.owner_id)
      || state.bookings.find((item) => item.listingId === chat.listing_id && item.renterId === chat.renter_id && item.ownerId === chat.owner_id);
    const messages = remoteMessages.filter((message) => message.conversation_id === chat.id);
    const legacy = state.mode === "admin_demo" ? state.messages.filter((message) => message.bookingId === booking?.id) : [];
    const latest = messages.at(-1);
    const lastLegacy = legacy.at(-1);
    const remoteIsLatest = !!latest && (!lastLegacy || latest.created_at >= lastLegacy.createdAt);
    rows.push({ id: chat.id, kind: "shared", shared: chat, listing, booking,
      other: chat.owner_id === user.id ? chat.renter_name : chat.chat_listings?.owner_name || "Owner",
      latestAt: remoteIsLatest ? latest.created_at : lastLegacy?.createdAt || chat.updated_at,
      preview: remoteIsLatest ? latest.body || "Photo" : lastLegacy?.text || "Start a conversation",
      unread: messages.filter((message) => message.receiver_id === user.id && !message.read_at).length + legacy.filter((message) => message.authorId !== user.id && !message.read).length });
  }
  for (const chat of state.mode === "admin_demo" ? state.chatConversations || [] : []) {
    if (![chat.renterId, chat.ownerId].includes(user.id)) continue;
    const listing = state.listings.find((item) => item.id === chat.listingId);
    if (!listing) continue;
    const booking = state.bookings.find((item) => item.id === params.bookingId && item.listingId === chat.listingId && item.renterId === chat.renterId && item.ownerId === chat.ownerId)
      || state.bookings.find((item) => item.listingId === chat.listingId && item.renterId === chat.renterId && item.ownerId === chat.ownerId);
    const messages = state.messages.filter((message) => message.conversationId === chat.id || message.bookingId === booking?.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const latest = messages.at(-1);
    const other = state.profiles.find((profile) => profile.id === (chat.ownerId === user.id ? chat.renterId : chat.ownerId));
    rows.push({ id: chat.id, kind: "demo", listing, booking, other: other?.name || "Participant", latestAt: latest?.createdAt || chat.createdAt,
      preview: latest?.text || (latest?.imageUri ? "Photo" : "Start a conversation"), unread: messages.filter((message) => message.authorId !== user.id && !message.read).length });
  }
  for (const booking of (state.mode === "admin_demo" ? state.bookings : []).filter((item) => [item.renterId, item.ownerId].includes(user.id))) {
    if (rows.some((row) => row.booking?.id === booking.id)) continue;
    const listing = state.listings.find((item) => item.id === booking.listingId);
    if (!listing) continue;
    const messages = state.messages.filter((message) => message.bookingId === booking.id);
    const latest = messages.at(-1);
    const other = state.profiles.find((profile) => profile.id === (booking.ownerId === user.id ? booking.renterId : booking.ownerId));
    rows.push({ id: `booking:${booking.id}`, kind: "booking", listing, booking, other: other?.name || "Participant",
      latestAt: latest?.createdAt || booking.createdAt, preview: latest?.text || "Start a conversation",
      unread: state.notifications.filter((notice) => notice.bookingId === booking.id && notice.userId === user.id && !notice.read && notice.title.includes("sent you a message")).length });
  }
  rows.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
  const visible = rows.filter((row) =>
    `${row.other} ${row.listing.title}`.toLowerCase().includes(search.toLowerCase()));
  const active = rows.find((row) => row.id === selected);
  const messages = [
    ...(active?.kind === "shared" ? remoteMessages.filter((message) => message.conversation_id === active.id)
      .map((message) => ({ id: message.id, sender: message.sender_id, text: message.body, image: message.image_path ? imageUrls[message.image_path] : undefined, at: message.created_at, read: !!message.read_at })) : []),
    ...state.messages.filter((message) => state.mode === "admin_demo" && (active?.kind === "demo" ? message.conversationId === active.id || message.bookingId === active.booking?.id : message.bookingId === active?.booking?.id))
      .map((message) => ({ id: message.id, sender: message.authorId, text: message.text, image: message.imageUri, at: message.createdAt, read: !!message.read })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  async function attach() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: false, quality: 0.75 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0], mime = asset.mimeType || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime) || (asset.fileSize || 0) > 2 * 1024 * 1024) throw new Error("Choose a JPEG, PNG or WebP photo no larger than 2 MB.");
      setPhoto({ uri: asset.uri, mime });
    } catch (failure) { setError((failure as Error).message); }
  }
  async function send() {
    if (!active || busy || (!draft.trim() && !photo)) return;
    setBusy(true); setError("");
    try {
      if (active.kind === "shared" && active.shared) {
        const path = photo ? await uploadChatImage(active.id, photo.uri, photo.mime) : undefined;
        await sendSharedMessage(active.shared, user!.id, draft, path);
        await refresh();
      } else if (active.kind === "demo") await actAndPersist({ type: "sendChat", conversationId: active.id, id: newId(), text: draft, imageUri: photo?.uri });
      else if (active.booking) {
        if (photo) throw new Error("Photo sharing for this older rental conversation requires a shared listing chat.");
        await actAndPersist({ type: "message", bookingId: active.booking.id, text: draft });
      }
      setDraft(""); setPhoto(null);
    } catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }


  function viewRentalItem() {
    if (!active?.booking) {
      if (active) router.push(`/listing/${active.listing.id}`);
      return;
    }
    if (active.booking.renterId === user!.id) {
      router.push({ pathname: "/(tabs)/rentals", params: { tab: rentalTabForBooking(active.booking), bookingId: active.booking.id } });
    } else {
      router.push({ pathname: "/owner", params: { section: "Rentals", bookingId: active.booking.id } });
    }
  }

  return <Screen bounded contentStyle={[styles.pageContent, mobile && styles.mobilePageContent]} title="Messages" subtitle={mobile ? undefined : "Chat with renters and owners about their listings."} headerGradient>
    {!!error && <Notice text={error} error />}
    <KeyboardAvoidingView style={styles.keyboardArea} behavior={mobile && Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.shell}>
      {(!mobile || !active) && <View style={[styles.sidebar, mobile && styles.mobileSidebar]}>
        <View style={mobile && styles.mobileSearchWrap}>{mobile && <Ionicons name="search-outline" size={18} color={colors.muted} />}<TextInput accessibilityLabel="Search conversations" placeholder="Search conversations" value={search} onChangeText={setSearch} style={[styles.search, mobile && styles.mobileSearch]} /></View>
        <ScrollView style={styles.conversationList} keyboardShouldPersistTaps="handled">{visible.length ? visible.map((row) => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Open conversation with ${row.other} about ${row.listing.title}`}
          onPress={() => { setSelected(row.id); setDraft(""); setPhoto(null); }} style={[styles.row, mobile && styles.mobileRow, selected === row.id && { backgroundColor: colors.paleBlue }]}>
          {row.listing.imageUrl
            ? <Image source={{ uri: row.listing.imageUrl }} style={[styles.rowThumb, mobile && styles.mobileRowThumb]} />
            : <View style={[styles.avatar, mobile && styles.mobileAvatar]}><Ionicons name="person-outline" size={21} color={colors.blue} /></View>}
          <View style={{ flex: 1 }}><View style={styles.rowTop}><Text style={styles.name} numberOfLines={1}>{row.other}</Text><Text style={s.caption}>{formatMalaysiaDateTime(row.latestAt).split(", ")[1]}</Text></View>
            <Text style={styles.roleLabel} numberOfLines={1}>{row.listing.ownerId === user.id ? "My Listing" : "Renting"} · {row.listing.title}</Text>
            <Text style={s.caption} numberOfLines={1}>{row.preview}</Text></View>
          <View style={styles.rowEnd}>
            {!!row.unread && <View style={[styles.badge, mobile && styles.mobileBadge]}><Text style={styles.badgeText}>{row.unread}</Text></View>}
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </View>
        </Pressable>) : <Empty title="No messages yet" text="Open a listing and tap Chat with Owner to start." />}</ScrollView>
      </View>}
      {(!mobile || !!active) && <View style={styles.chat}>
        {active ? <>
          <View style={styles.header}>{mobile && <Pressable accessibilityRole="button" accessibilityLabel="Back to conversations" onPress={() => setSelected(null)}><Ionicons name="arrow-back" size={24} color={colors.navy} /></Pressable>}
            <View style={styles.avatar}><Ionicons name="person-outline" size={21} color={colors.blue} /></View><View><Text style={styles.name}>{active.other}</Text><Text style={s.caption}>{active.booking?.status || "Listing enquiry"}</Text></View></View>
          <Pressable accessibilityRole="button" onPress={viewRentalItem} style={styles.listing}>
            {!!active.listing.imageUrl && <Image source={{ uri: active.listing.imageUrl }} style={styles.listingImage} />}
            <View style={{ flex: 1 }}><Text style={styles.itemName}>{active.listing.title}</Text><Text style={s.caption}>{money(active.listing.dailyPrice)} / day · Owner: {active.listing.ownerId === user.id ? user.name : active.other}</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.blue} /></Pressable>
          {!!active.booking && <Button secondary onPress={viewRentalItem}>View Rental Details</Button>}
          {active.listing.ownerId !== user.id && <Button secondary onPress={() => router.push(`/listing/${active.listing.id}`)}>Book This Item</Button>}
          <ScrollView ref={scroll} style={styles.messages} keyboardShouldPersistTaps="handled" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
            {!messages.length && <Text style={styles.emptyChat}>No messages yet. Send the first message.</Text>}
            {messages.map((message) => <View key={message.id} style={[styles.bubble, message.sender === user.id ? styles.sent : styles.received]}>
              {!!message.text && <Text style={[s.body, message.sender === user.id && { color: "white" }]}>{message.text}</Text>}
              {!!message.image && <Pressable accessibilityRole="button" accessibilityLabel="Open chat photo" onPress={() => setLargePhoto(message.image!)}><Image source={{ uri: message.image }} style={styles.messageImage} /></Pressable>}
              <Text style={[styles.time, message.sender === user.id && { color: "#DCE8FF" }]}>{formatMalaysiaDateTime(message.at)} {message.sender === user.id ? message.read ? "· Read" : "· Sent" : ""}</Text>
            </View>)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll} contentContainerStyle={styles.suggestions}>{suggestions.map((text) => <Pressable key={text} accessibilityRole="button" onPress={() => setDraft(text)} style={styles.suggestion}><Text style={styles.suggestionText} numberOfLines={1}>{text}</Text></Pressable>)}</ScrollView>
          {!!photo && <View style={styles.photoPreview}><Image source={{ uri: photo.uri }} style={styles.listingImage} /><Text style={s.caption}>Photo ready to send</Text><Pressable onPress={() => setPhoto(null)}><Ionicons name="close-circle" size={23} color={colors.muted} /></Pressable></View>}
          <View style={styles.composer}><Pressable accessibilityRole="button" accessibilityLabel="Attach photo" onPress={() => void attach()}><Ionicons name="image-outline" size={25} color={colors.blue} /></Pressable>
            <TextInput accessibilityLabel="Message" placeholder="Write a message…" value={draft} onChangeText={setDraft} multiline maxLength={2000} style={styles.input} />
            <Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={busy || (!draft.trim() && !photo)} onPress={() => void send()} style={[styles.send, (busy || (!draft.trim() && !photo)) && { opacity: 0.5 }]}><Ionicons name="send" size={20} color="white" /></Pressable></View>
        </> : <Empty title="Select a conversation" text="Choose a conversation to view its messages." icon="chatbubble-ellipses-outline" />}
      </View>}
    </View>
    </KeyboardAvoidingView>
    <Modal transparent visible={!!largePhoto} onRequestClose={() => setLargePhoto(null)}><Pressable onPress={() => setLargePhoto(null)} style={styles.overlay}>{!!largePhoto && <Image source={{ uri: largePhoto }} resizeMode="contain" style={{ width: "100%", height: "90%" }} />}</Pressable></Modal>
  </Screen>;
}

const styles = StyleSheet.create({
  pageContent: { minHeight: 0 },
  mobilePageContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  roleLabel: { alignSelf: "stretch", color: colors.blue, fontSize: 11, fontWeight: "700", marginTop: 2, marginBottom: 1 },
  mobileSidebar: { width: "100%", backgroundColor: colors.white, borderRightWidth: 0 },
  mobileSearchWrap: { flexDirection: "row", alignItems: "center", gap: 8, margin: 12, paddingHorizontal: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 12 },
  mobileSearch: { flex: 1, margin: 0, paddingHorizontal: 0, borderWidth: 0, minWidth: 0 },
  mobileRow: { paddingHorizontal: 12, paddingVertical: 12, marginHorizontal: 10, marginVertical: 5, borderRadius: 16, borderBottomWidth: 0, shadowColor: colors.navy, shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  mobileAvatar: { width: 56, height: 56, borderRadius: 28 },
  mobileRowThumb: { width: 56, height: 56, borderRadius: 14 },
  mobileBadge: { backgroundColor: colors.danger },
  keyboardArea: { flex: 1, minHeight: 0 },
  shell: { flex: 1, minHeight: 0, flexDirection: "row", backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, overflow: "hidden", marginTop: 12, shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sidebar: { width: "38%", minHeight: 0, minWidth: 0, borderRightWidth: 1, borderRightColor: colors.border, backgroundColor: colors.white }, search: { margin: 14, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, color: colors.navy, backgroundColor: colors.white },
  conversationList: { flex: 1, minHeight: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, cursor: "pointer" }, rowTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.softBlue, alignItems: "center", justifyContent: "center" }, name: { color: colors.navy, fontSize: 16, fontWeight: "700" },
  rowThumb: { width: 48, height: 48, borderRadius: 12 },
  rowEnd: { alignItems: "center", gap: 6 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 7, marginVertical: 3 }, smallImage: { width: 30, height: 30, borderRadius: 6 }, itemName: { color: colors.slate, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center" }, badgeText: { color: "white", fontSize: 11, fontWeight: "700" },
  chat: { flex: 1, minHeight: 0, padding: 14, minWidth: 0 }, header: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  listing: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.paleBlue, padding: 10, borderRadius: 12, marginBottom: 10 }, listingImage: { width: 48, height: 48, borderRadius: 8 },
  messages: { flex: 1, minHeight: 0, marginVertical: 10 }, emptyChat: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 20 }, bubble: { padding: 12, borderRadius: 14, marginVertical: 5, maxWidth: "80%" }, sent: { alignSelf: "flex-end", backgroundColor: colors.blue }, received: { alignSelf: "flex-start", backgroundColor: colors.paleBlue },
  time: { fontSize: 10, color: colors.muted, marginTop: 5 }, messageImage: { width: 190, height: 160, borderRadius: 8, marginTop: 4 },
  suggestionScroll: { flexGrow: 0, flexShrink: 0, width: "100%" },
  suggestions: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  suggestion: { alignSelf: "center", flexShrink: 0, backgroundColor: colors.white, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, borderWidth: 1, borderColor: colors.blue, cursor: "pointer" },
  suggestionText: { color: colors.blue, fontSize: 12 },
  photoPreview: { flexDirection: "row", alignItems: "center", gap: 10 }, composer: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  input: { flex: 1, minHeight: 42, maxHeight: 110, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, color: colors.navy }, send: { backgroundColor: colors.blue, borderRadius: 12, padding: 11 },
  overlay: { flex: 1, justifyContent: "center", backgroundColor: "#000D", padding: 20 },
});
