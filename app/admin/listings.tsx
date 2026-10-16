import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { Button, Card, Field, Notice, Screen, s } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { fetchPendingListingReviews, reviewChatListing, type SharedChatListing } from "../../services/chat";

export default function ListingReviews() {
  const [authorized, setAuthorized] = useState(false);
  const [pending, setPending] = useState<SharedChatListing[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    if (!supabase) return;
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || data.user?.app_metadata.current_admin !== true) {
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
    setPending(await fetchPendingListingReviews());
  }

  useEffect(() => { void refresh().catch((e) => setError((e as Error).message)); }, []);

  async function decide(listingId: string, approve: boolean) {
    if (busy) return;
    setBusy(listingId);
    setError("");
    try {
      await reviewChatListing(listingId, approve, reason[listingId]);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return <Screen back title="Listing Reviews" subtitle="CurRENT administration">
    {!authorized ? <Notice text="An authorised CurRENT administrator account is required." error /> : <>
      {!!error && <Notice text={error} error />}
      {pending.length === 0 && <Text style={s.body}>No listings are awaiting review.</Text>}
      {pending.map((entry) => {
        const listing = entry.listing_data;
        return <Card key={entry.listing_id}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Image source={{ uri: listing.imageUrl }} style={{ width: 72, height: 72, borderRadius: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>{listing.title}</Text>
              <Text style={s.caption}>{entry.owner_name} · {listing.category} · RM{listing.dailyPrice.toFixed(2)}/day</Text>
              <Text style={s.caption}>{listing.location}</Text>
            </View>
          </View>
          <Text style={s.body}>{listing.description}</Text>
          {listing.images?.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {listing.images.map((uri, index) => <Image key={`${uri}-${index}`} source={{ uri }} style={{ width: 64, height: 64, borderRadius: 8 }} />)}
          </View> : null}
          <Field label="Rejection reason" value={reason[entry.listing_id] || ""}
            onChangeText={(value) => setReason((current) => ({ ...current, [entry.listing_id]: value }))}
            placeholder="Required when rejecting" />
          <Button disabled={busy !== null} onPress={() => void decide(entry.listing_id, true)}>Approve</Button>
          <Button secondary disabled={busy !== null || !(reason[entry.listing_id] || "").trim()}
            onPress={() => void decide(entry.listing_id, false)}>Reject</Button>
        </Card>;
      })}
    </>}
  </Screen>;
}
