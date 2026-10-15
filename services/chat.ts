import { supabase } from "../lib/supabase";
import type { Listing } from "../types";

export interface SharedChatListing {
  listing_id: string;
  owner_id: string;
  owner_name: string;
  listing_data: Listing;
  published: boolean;
}
export interface SharedConversation {
  id: string;
  listing_id: string;
  renter_id: string;
  renter_name: string;
  owner_id: string;
  booking_id: string | null;
  created_at: string;
  updated_at: string;
  chat_listings?: SharedChatListing;
}
export interface SharedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  image_path: string | null;
  read_at: string | null;
  created_at: string;
}

function client() {
  if (!supabase) throw new Error("Messaging requires a configured Supabase connection.");
  return supabase;
}
function fail(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(`${fallback} ${error.message}`);
}

export async function publishChatListing(listing: Listing, ownerName: string) {
  const safeListing = { ...listing, privateMeetingVenue: undefined, ownerEstimatedValue: undefined };
  const { error } = await client().from("chat_listings").upsert({
    listing_id: listing.id,
    owner_id: listing.ownerId,
    owner_name: ownerName,
    listing_data: safeListing,
    published: listing.status === "published",
    updated_at: new Date().toISOString(),
  }, { onConflict: "listing_id" });
  fail(error, "Could not publish messaging information for the listing.");
}

export async function unpublishChatListing(listingId: string) {
  const { error } = await client().from("chat_listings").update({ published: false, updated_at: new Date().toISOString() }).eq("listing_id", listingId);
  fail(error, "Could not remove the listing from shared messaging.");
}

export async function fetchPublishedChatListings(): Promise<SharedChatListing[]> {
  const { data, error } = await client().from("chat_listings")
    .select("listing_id,owner_id,owner_name,listing_data,published")
    .eq("published", true);
  fail(error, "Could not load shared listings.");
  return (data || []) as SharedChatListing[];
}

export async function fetchChatInbox(): Promise<{ conversations: SharedConversation[]; messages: SharedMessage[] }> {
  const { data: conversations, error } = await client().from("chat_conversations")
    .select("*,chat_listings(listing_id,owner_id,owner_name,listing_data,published)")
    .order("updated_at", { ascending: false });
  fail(error, "Could not load conversations.");
  const ids = (conversations || []).map((item) => item.id as string);
  if (!ids.length) return { conversations: [], messages: [] };
  const { data: messages, error: messageError } = await client().from("chat_messages")
    .select("*").in("conversation_id", ids).order("created_at", { ascending: true });
  fail(messageError, "Could not load messages.");
  return { conversations: (conversations || []) as SharedConversation[], messages: (messages || []) as SharedMessage[] };
}

export async function openSharedConversation(listingId: string, ownerId: string, renterId: string, renterName: string): Promise<SharedConversation> {
  if (ownerId === renterId) throw new Error("You cannot message yourself.");
  const db = client();
  const existing = await db.from("chat_conversations").select("*")
    .eq("listing_id", listingId).eq("owner_id", ownerId).eq("renter_id", renterId).maybeSingle();
  fail(existing.error, "Could not open this conversation.");
  if (existing.data) return existing.data as SharedConversation;
  const created = await db.from("chat_conversations").insert({ listing_id: listingId, owner_id: ownerId, renter_id: renterId, renter_name: renterName })
    .select("*").single();
  if (created.error?.code === "23505") {
    const retry = await db.from("chat_conversations").select("*")
      .eq("listing_id", listingId).eq("owner_id", ownerId).eq("renter_id", renterId).single();
    fail(retry.error, "Could not open this conversation.");
    return retry.data as SharedConversation;
  }
  fail(created.error, "Could not open this conversation.");
  return created.data as SharedConversation;
}

export async function openBookingConversation(listingId: string, ownerId: string, renterId: string, renterName: string): Promise<SharedConversation> {
  if (ownerId === renterId) throw new Error("You cannot message yourself.");
  const db = client();
  const { data: { user }, error: authError } = await db.auth.getUser();
  fail(authError, "Could not verify your account.");
  if (user?.id !== ownerId && user?.id !== renterId) throw new Error("Only rental participants can open this conversation.");
  return openSharedConversation(listingId, ownerId, renterId, renterName);
}

export async function sendSharedMessage(conversation: SharedConversation, senderId: string, body: string, imagePath?: string) {
  const text = body.trim();
  if ((!text && !imagePath) || text.length > 2000) throw new Error("Enter a message of up to 2,000 characters or attach an image.");
  if (senderId !== conversation.owner_id && senderId !== conversation.renter_id) throw new Error("Only conversation participants can send messages.");
  const receiverId = senderId === conversation.owner_id ? conversation.renter_id : conversation.owner_id;
  const { error } = await client().from("chat_messages").insert({
    conversation_id: conversation.id, sender_id: senderId, receiver_id: receiverId,
    body: text, image_path: imagePath || null,
  });
  fail(error, "Could not send message.");
  await client().from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id);
}

export async function markSharedChatRead(conversationId: string, userId: string) {
  const { error } = await client().from("chat_messages").update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId).eq("receiver_id", userId).is("read_at", null);
  fail(error, "Could not mark messages as read.");
}

export async function uploadChatImage(conversationId: string, uri: string, mimeType: string) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) throw new Error("Choose a JPEG, PNG or WebP image.");
  const response = await fetch(uri);
  const blob = await response.blob();
  if (blob.size > 2 * 1024 * 1024) throw new Error("Chat photos must be 2 MB or smaller.");
  const extension = mimeType.split("/")[1] === "jpeg" ? "jpg" : mimeType.split("/")[1];
  const path = `${conversationId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client().storage.from("chat-images").upload(path, blob, { contentType: mimeType, upsert: false });
  fail(error, "Could not upload photo.");
  return path;
}

export async function signedChatImage(path: string) {
  const { data, error } = await client().storage.from("chat-images").createSignedUrl(path, 3600);
  fail(error, "Could not open photo.");
  return data?.signedUrl || "";
}
