import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  Card,
  Chips,
  Empty,
  Field,
  Notice,
  PhotoPicker,
  Screen,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { categories } from "../../constants/categories";
import { newId } from "../../services/marketplace";
import type { CollectionMethod } from "../../types";
import { colors } from "../../constants/theme";
const methodOptions: CollectionMethod[] = [
  "Meet Owner",
  "Self-Pickup",
  "Delivery Available",
];
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
  const [photos, setPhotos] = useState(
    existing?.images || (existing?.imageUrl ? [existing.imageUrl] : []),
  );
  const [start, setStart] = useState(existing?.availableFrom || "");
  const [end, setEnd] = useState(existing?.availableTo || "");
  const [collectionMethods, setCollectionMethods] = useState<
    CollectionMethod[]
  >(existing?.collectionMethods || ["Meet Owner"]);
  const [pickupWindowsStr, setPickupWindowsStr] = useState(
    existing?.pickupTimeWindows
      ? existing.pickupTimeWindows.map((w) => `${w.start}-${w.end}`).join(", ")
      : "10:00-12:00, 14:00-18:00",
  );
  const [error, setError] = useState("");
  if (!user || (id && !existing))
    return (
      <Screen back>
        <Empty
          title="Listing unavailable"
          text="Sign in as the owner to create or edit listings."
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
          imageUrl: photos[0] || "",
          availableFrom: start || undefined,
          availableTo: end || undefined,
          collectionMethods,
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
        <Text style={s.h2}>Item photos</Text>
        <Text style={s.caption}>
          Add up to six photos. The main photo appears in the marketplace. At
          least one photo is required to publish.
        </Text>
        <PhotoPicker photos={photos} onChange={setPhotos} />
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
          label="Pickup location"
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
        <Text style={s.label}>Collection methods</Text>
        <Text style={s.caption}>
          Select at least one. Delivery uses an external logistics partner in a
          live service; no delivery charge is calculated in this demo.
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {methodOptions.map((option) => (
            <Pressable
              key={option}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: collectionMethods.includes(option),
              }}
              onPress={() =>
                setCollectionMethods(
                  collectionMethods.includes(option)
                    ? collectionMethods.filter((method) => method !== option)
                    : [...collectionMethods, option],
                )
              }
              style={[
                s.chip,
                collectionMethods.includes(option) && {
                  backgroundColor: colors.navy,
                },
              ]}
            >
              <Text
                style={[
                  s.label,
                  collectionMethods.includes(option) && { color: "white" },
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
        {!!error && <Notice text={error} error />}
        <View style={{ gap: 10 }}>
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
              !photos.length ||
              !collectionMethods.length
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
