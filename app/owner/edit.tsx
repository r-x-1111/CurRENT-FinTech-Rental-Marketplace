import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  Chips,
  Empty,
  Field,
  MediaPicker,
  Notice,
  Screen,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { categories } from "../../constants/categories";
import { newId } from "../../services/marketplace";
import { colors } from "../../constants/theme";

export default function EditListing() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, user, act } = useMarketplace();
  const existing = state.listings.find(
    (l) => l.id === id && l.ownerId === user?.id,
  );

  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [category, setCategory] = useState(existing?.category || "Electronics");
  const [location, setLocation] = useState(existing?.location || "");
  const [price, setPrice] = useState(existing?.dailyPrice.toString() || "");
  const [value, setValue] = useState(existing?.estimatedValue.toString() || "");
  const [photos, setPhotos] = useState<string[]>(
    existing?.images && existing.images.length >= 6
      ? existing.images
      : existing?.images || (existing?.imageUrl ? [existing.imageUrl] : []),
  );
  const [videos, setVideos] = useState<string[]>(
    existing?.videos && existing.videos.length >= 1
      ? existing.videos
      : existing ? ["/videos/listing-preview-sample.mp4"] : [],
  );
  const [start, setStart] = useState(existing?.availableFrom || "");
  const [end, setEnd] = useState(existing?.availableTo || "");
  const [pickupWindowsStr, setPickupWindowsStr] = useState(
    existing?.pickupTimeWindows
      ? existing.pickupTimeWindows.map((w) => `${w.start}-${w.end}`).join(", ")
      : "10:00-12:00, 14:00-18:00",
  );
  const [error, setError] = useState("");

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (id && !existing)
    return (
      <Screen back>
        <Empty
          title="Listing unavailable"
          text="This listing could not be found."
        />
      </Screen>
    );

  function save(status: "draft" | "published") {
    try {
      const parsedWindows = pickupWindowsStr
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((part) => {
          const [wStart, wEnd] = part.split("-").map((t) => t.trim());
          return { start: wStart || "10:00", end: wEnd || "12:00" };
        });

      act({
        type: "saveListing",
        listing: {
          id: existing?.id || newId(),
          ownerId: user!.id,
          title: title.trim(),
          description: description.trim(),
          category,
          location: location.trim(),
          dailyPrice: Number(price),
          estimatedValue: Number(value),
          images: photos,
          videos,
          imageUrl: photos[0] || "",
          availableFrom: start || undefined,
          availableTo: end || undefined,
          collectionMethods: ["Delivery Only"],
          rating: existing?.rating || 0,
          verifiedOwner: user!.verification === "verified",
          status,
          pickupTimeWindows:
            parsedWindows.length >= 2
              ? parsedWindows
              : [
                  { start: "10:00", end: "12:00" },
                  { start: "14:00", end: "18:00" },
                ],
        },
      });
      router.replace("/owner");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen
      back
      title={
        existing ? "Make your listing shine" : "Give your gear a second life"
      }
      subtitle="A few details today. A little extra income tomorrow."
    >
      <Card>
        {/* Media Upload Section: Min 6 photos and 1 video required per V3.23 */}
        <MediaPicker
          title="Listing Media (Photos & Video)"
          subtitle="Publishing requires at least 6 photos and 1 video. Upload clear pictures of your item, accessories, and a short functional video."
          photos={photos}
          onPhotosChange={setPhotos}
          videos={videos}
          onVideosChange={setVideos}
          minPhotos={6}
          maxPhotos={10}
          minVideos={1}
          maxVideos={3}
          allowMainSelect
          samplePrefix="listing"
        />

        <Field
          label="Listing title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Sony A7 III with kit lens"
        />
        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="What’s included, item condition and anything renters should know."
        />
        <Text style={s.label}>Category</Text>
        <Chips
          options={categories.slice(1)}
          selected={category}
          onSelect={setCategory}
        />
        <Field
          label="Service area / locality"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Petaling Jaya"
        />
        <Field
          label="Daily rental price (RM)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
        <Field
          label="Estimated replacement value (RM)"
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
        />
        <Notice text="Replacement value helps estimate the risk-based refundable security deposit." />
        <Field
          label="Available from (YYYY-MM-DD, optional)"
          value={start}
          onChangeText={setStart}
        />
        <Field
          label="Available until (YYYY-MM-DD, optional)"
          value={end}
          onChangeText={setEnd}
        />

        {/* Fixed Fulfilment Label: Delivery Only per V3.23 */}
        <View style={{ marginTop: 6, marginBottom: 12 }}>
          <Text style={s.label}>Fulfilment method</Text>
          <View style={styles.deliveryOnlyBadge}>
            <Ionicons name="car-outline" size={16} color={colors.blue} />
            <Text style={styles.deliveryOnlyText}>Delivery Only</Text>
          </View>
          <Text style={s.caption}>
            All CurRENT items use Delivery Only. Lenders arrange direct dispatch to the renter's private address upon booking confirmation.
          </Text>
        </View>

        {!!error && <Notice text={error} error />}

        <View style={{ gap: 10, marginTop: 8 }}>
          {existing && (
            <Button
              secondary
              onPress={() => router.push(`/listing/${existing.id}`)}
            >
              Preview listing
            </Button>
          )}
          <Button
            disabled={
              !title.trim() ||
              !description.trim() ||
              !location.trim() ||
              !price ||
              !value ||
              photos.length < 6 ||
              videos.length < 1
            }
            onPress={() => save("published")}
          >
            Publish listing
          </Button>
          <Button secondary onPress={() => save("draft")}>
            Save as draft
          </Button>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  deliveryOnlyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  deliveryOnlyText: {
    color: colors.blue,
    fontWeight: "700",
    fontSize: 13,
  },
});
