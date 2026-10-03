import { useState } from "react";
import { Text, View } from "react-native";
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
export default function EditListing() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, user, act } = useMarketplace();
  const existing = state.listings.find(
    (l) => l.id === id && l.ownerId === user?.id,
  );
  const [title, setTitle] = useState(existing?.title || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [category, setCategory] = useState(existing?.category || "Cameras");
  const [location, setLocation] = useState(existing?.location || "");
  const [price, setPrice] = useState(existing?.dailyPrice.toString() || "");
  const [value, setValue] = useState(existing?.estimatedValue.toString() || "");
  const [photos, setPhotos] = useState(
    existing?.images || (existing?.imageUrl ? [existing.imageUrl] : []),
  );
  const [start, setStart] = useState(existing?.availableFrom || "");
  const [end, setEnd] = useState(existing?.availableTo || "");
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
          rating: existing?.rating || 0,
          verifiedOwner: user!.verification === "verified",
          status,
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
        {!!error && <Notice text={error} error />}
        <View style={{ gap: 10 }}>
          <Button onPress={() => save("published")}>Publish listing</Button>
          <Button secondary onPress={() => save("draft")}>
            Save as draft
          </Button>
        </View>
      </Card>
    </Screen>
  );
}
