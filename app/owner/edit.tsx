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
import type { AvailabilityPeriod } from "../../types";
export const FIXED_DELIVERY_SLOTS = [
  { value: "10:00", label: "10 AM", fullLabel: "10:00 AM" },
  { value: "11:00", label: "11 AM", fullLabel: "11:00 AM" },
  { value: "12:00", label: "12 PM", fullLabel: "12:00 PM" },
  { value: "13:00", label: "1 PM", fullLabel: "1:00 PM" },
  { value: "14:00", label: "2 PM", fullLabel: "2:00 PM" },
  { value: "15:00", label: "3 PM", fullLabel: "3:00 PM" },
  { value: "16:00", label: "4 PM", fullLabel: "4:00 PM" },
  { value: "17:00", label: "5 PM", fullLabel: "5:00 PM" },
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
  const [location, setLocation] = useState(existing?.location || "Petaling Jaya");
  
  // Private dispatch address fields
  const [addressLine1, setAddressLine1] = useState(
    existing?.privateMeetingVenue?.split(", ")[0] || "No. 12, Jalan SS 15/4",
  );
  const [addressLine2, setAddressLine2] = useState(
    existing?.privateMeetingVenue?.split(", ")[1]?.includes("Jaya") ? "" : existing?.privateMeetingVenue?.split(", ")[1] || "",
  );
  const [postcode, setPostcode] = useState("47500");
  const [city, setCity] = useState("Subang Jaya");
  const [stateName, setStateName] = useState("Selangor");

  const [price, setPrice] = useState(existing?.dailyPrice?.toString() || "");
  
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

  // Availability periods
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>(
    existing?.availabilityPeriods && existing.availabilityPeriods.length > 0
      ? existing.availabilityPeriods
      : existing?.availableFrom && existing?.availableTo
      ? [{ start: existing.availableFrom, end: existing.availableTo }]
      : [{ start: "2026-10-20", end: "2026-11-20" }],
  );
  const [inputStart, setInputStart] = useState("");
  const [inputEnd, setInputEnd] = useState("");

  // 8 Fixed Delivery Slots (README V3.23 Section 4.3 & 17.8)
  const initialSlots =
    existing?.deliveryTimeSlots && existing.deliveryTimeSlots.length > 0
      ? existing.deliveryTimeSlots
      : existing?.pickupTimeWindows && existing.pickupTimeWindows.length > 0
      ? existing.pickupTimeWindows.map((w) => w.start)
      : ["10:00", "11:00", "14:00", "17:00"];
  const [selectedSlots, setSelectedSlots] = useState<string[]>(initialSlots);

  // Listing Boost (RM10 for 7 days)
  const [boostListing, setBoostListing] = useState(
    Boolean(existing?.featuredUntil && new Date(existing.featuredUntil).getTime() > Date.now()),
  );

  const [error, setError] = useState("");

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (id && !existing) {
    return (
      <Screen back>
        <Empty
          title="Listing unavailable"
          text="This listing could not be found."
        />
      </Screen>
    );
  }

  const dailyPriceNum = parseFloat(price);
  const estimatedPayout =
    !isNaN(dailyPriceNum) && dailyPriceNum > 0
      ? (dailyPriceNum * 0.88).toFixed(2)
      : "—";

  function handleAddPeriod() {
    if (!inputStart.trim() || !inputEnd.trim()) {
      setError("Please specify both Start Date and End Date.");
      return;
    }
    setError("");
    setPeriods((prev) => [...prev, { start: inputStart.trim(), end: inputEnd.trim() }]);
    setInputStart("");
    setInputEnd("");
  }

  function handleRemovePeriod(index: number) {
    setPeriods((prev) => prev.filter((_, i) => i !== index));
  }

  function handleEditPeriod(index: number) {
    const p = periods[index];
    if (p) {
      setInputStart(p.start);
      setInputEnd(p.end);
      setPeriods((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function toggleSlot(slotVal: string) {
    setError("");
    setSelectedSlots((prev) =>
      prev.includes(slotVal)
        ? prev.filter((s) => s !== slotVal)
        : [...prev, slotVal].sort(),
    );
  }

  function save(status: "draft" | "published") {
    try {
      if (selectedSlots.length < 2 && status === "published") {
        setError("Select at least 2 delivery time slots.");
        return;
      }

      if (periods.length === 0 && status === "published") {
        setError("Please add at least one availability period before publishing.");
        return;
      }

      const formattedDispatchAddress = [
        addressLine1.trim(),
        addressLine2.trim(),
        `${postcode.trim()} ${city.trim()}`,
        stateName.trim(),
      ]
        .filter(Boolean)
        .join(", ");

      const internalEstimatedValue =
        existing?.estimatedValue ?? (dailyPriceNum > 0 ? dailyPriceNum * 10 : 500);

      act({
        type: "saveListing",
        listing: {
          id: existing?.id || newId(),
          ownerId: user!.id,
          title: title.trim(),
          description: description.trim(),
          category,
          location: location.trim(),
          publicArea: location.trim(),
          privateMeetingVenue: formattedDispatchAddress,
          dailyPrice: Number(price),
          estimatedValue: internalEstimatedValue,
          images: photos,
          videos,
          imageUrl: photos[0] || "",
          availableFrom: periods[0]?.start || undefined,
          availableTo: periods[periods.length - 1]?.end || undefined,
          availabilityPeriods: periods,
          collectionMethods: ["Delivery Only"],
          rating: existing?.rating || 0,
          verifiedOwner: user!.verification === "verified",
          status,
          featuredUntil: boostListing
            ? new Date(Date.now() + 7 * 86400000).toISOString()
            : existing?.featuredUntil,
          deliveryTimeSlots: selectedSlots,
          pickupTimeWindows: selectedSlots.map((s) => ({ start: s, end: s })),
        },
      });
      router.replace("/owner");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const canPublish =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    location.trim().length > 0 &&
    addressLine1.trim().length > 0 &&
    dailyPriceNum > 0 &&
    photos.length >= 6 &&
    videos.length >= 1 &&
    periods.length >= 1 &&
    selectedSlots.length >= 2;

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

        {/* Public locality vs Private dispatch address */}
        <Field
          label="Service area / locality (Public)"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Petaling Jaya"
        />
        <Text style={[s.caption, { marginTop: -8, marginBottom: 14 }]}>
          Shown on public listing cards next to the map pin icon.
        </Text>

        <View style={styles.privateAddressBox}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Ionicons name="lock-closed" size={16} color={colors.navy} />
            <Text style={styles.privateAddressTitle}>Private Item / Dispatch Address</Text>
          </View>
          <Text style={styles.privateAddressSub}>
            Private to you and CurRENT. Never revealed publicly to browsers or renters. Used strictly for courier dispatch.
          </Text>

          <Field
            label="Street / Address line 1"
            value={addressLine1}
            onChangeText={setAddressLine1}
            placeholder="e.g. No. 12, Jalan SS 15/4"
          />
          <Field
            label="Unit / Building / Line 2 (Optional)"
            value={addressLine2}
            onChangeText={setAddressLine2}
            placeholder="e.g. Level 2, Unit B"
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field
                label="Postcode"
                value={postcode}
                onChangeText={setPostcode}
                placeholder="47500"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1.5 }}>
              <Field
                label="City / District"
                value={city}
                onChangeText={setCity}
                placeholder="Subang Jaya"
              />
            </View>
          </View>
          <Field
            label="State"
            value={stateName}
            onChangeText={setStateName}
            placeholder="Selangor"
          />
        </View>

        <Field
          label="Daily rental price (RM)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="e.g. 45.00"
        />

        {/* Read-only Estimated Payout (RM/day) - 88% of daily rental price */}
        <View style={styles.payoutContainer}>
          <Text style={s.label}>Estimated payout (RM/day)</Text>
          <View style={styles.payoutBox}>
            <Text style={styles.payoutValue}>
              {estimatedPayout !== "—" ? `RM ${estimatedPayout}` : "—"}
            </Text>
            <Text style={styles.payoutSub}>88% of daily price</Text>
          </View>
        </View>

        {/* Exact Pale-blue 12% commission notice from Section 4.2 / website reference */}
        <View style={styles.commissionNoticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.navy} />
          <Text style={styles.commissionNoticeText}>
            CurRENT charges a 12% commission only when a rental is successfully completed. Your payout will be released once the deposit has been settled.
          </Text>
        </View>

        {/* Compact Availability Section (Section 4.3) */}
        <View style={{ marginTop: 14, marginBottom: 14 }}>
          <Text style={s.label}>Availability</Text>
          <Text style={[s.caption, { marginBottom: 10 }]}>
            Set the date ranges when your item is available for rent.
          </Text>

          {/* Current saved periods */}
          {periods.length > 0 && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              {periods.map((p, idx) => (
                <View key={`${p.start}-${p.end}-${idx}`} style={styles.periodRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Ionicons name="calendar-outline" size={16} color={colors.blue} />
                    <Text style={styles.periodDateText}>
                      {p.start} – {p.end}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleEditPeriod(idx)}
                      style={styles.periodActionBtn}
                    >
                      <Text style={styles.periodActionText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => handleRemovePeriod(idx)}
                      style={[styles.periodActionBtn, { borderColor: "#FCA5A5" }]}
                    >
                      <Text style={[styles.periodActionText, { color: "#DC2626" }]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Add period inputs */}
          <View style={styles.addPeriodBox}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="Start Date"
                  value={inputStart}
                  onChangeText={setInputStart}
                  placeholder="2026-10-20"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="End Date"
                  value={inputEnd}
                  onChangeText={setInputEnd}
                  placeholder="2026-11-20"
                />
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleAddPeriod}
              style={styles.addAvailabilityBtn}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.blue} />
              <Text style={styles.addAvailabilityText}>+ Add Availability</Text>
            </Pressable>
          </View>
        </View>

        {/* Scheduled Delivery Time Slots (README V3.23 Section 4.3 & 17.8) */}
        <View style={{ marginTop: 14, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={s.label}>Available delivery time slots</Text>
            <Text style={[s.caption, { marginTop: 0, fontWeight: "600", color: selectedSlots.length >= 2 ? colors.navy : colors.danger }]}>
              {selectedSlots.length}/8 selected (min 2 required)
            </Text>
          </View>
          <Text style={[s.caption, { marginTop: -4, marginBottom: 10 }]}>
            Select at least 2 of the 8 fixed delivery-start hours. Renters can only book during your chosen slots.
          </Text>
          <View style={styles.fixedSlotsGrid}>
            {FIXED_DELIVERY_SLOTS.map((slot) => {
              const isSelected = selectedSlots.includes(slot.value);
              return (
                <Pressable
                  key={slot.value}
                  accessibilityRole="button"
                  accessibilityLabel={`${slot.fullLabel} (${slot.label}) delivery slot`}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => toggleSlot(slot.value)}
                  style={[
                    styles.fixedSlotBtn,
                    isSelected && styles.fixedSlotBtnSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.fixedSlotText,
                      isSelected && styles.fixedSlotTextSelected,
                    ]}
                  >
                    {slot.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Optional Listing Boost (Section 4.2) */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: boostListing }}
          onPress={() => setBoostListing(!boostListing)}
          style={[styles.boostBox, boostListing && styles.boostBoxActive]}
        >
          <Ionicons
            name={boostListing ? "checkbox" : "square-outline"}
            size={20}
            color={boostListing ? colors.blue : colors.muted}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.boostTitle}>Listing Boost — RM10 for 7 days (Optional)</Text>
            <Text style={styles.boostSub}>
              Give your item featured placement prominence at the top of the searchable Home catalogue.
            </Text>
          </View>
        </Pressable>

        {/* Fixed Fulfilment Label: Delivery Only per V3.23 */}
        <View style={{ marginTop: 14, marginBottom: 14 }}>
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
            disabled={!canPublish}
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
  payoutContainer: {
    gap: 7,
    marginBottom: 10,
  },
  payoutBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payoutValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
  },
  payoutSub: {
    fontSize: 12,
    color: colors.slate,
    fontWeight: "600",
  },
  commissionNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.paleBlue,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.softBlue,
    marginBottom: 14,
  },
  commissionNoticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.navy,
    lineHeight: 18,
  },
  privateAddressBox: {
    backgroundColor: colors.paleBlue,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.softBlue,
    padding: 14,
    marginBottom: 14,
  },
  privateAddressTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  privateAddressSub: {
    fontSize: 12,
    color: colors.slate,
    lineHeight: 17,
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  periodDateText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navy,
  },
  periodActionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "white",
  },
  periodActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },
  addPeriodBox: {
    backgroundColor: "#FAFAFA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addAvailabilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    backgroundColor: colors.paleBlue,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.softBlue,
  },
  addAvailabilityText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "700",
  },
  boostBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  boostBoxActive: {
    borderColor: colors.blue,
    backgroundColor: colors.paleBlue,
  },
  boostTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  boostSub: {
    fontSize: 12,
    color: colors.slate,
    marginTop: 2,
    lineHeight: 16,
  },
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
  fixedSlotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  fixedSlotBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "white",
    minWidth: 70,
    alignItems: "center",
  },
  fixedSlotBtnSelected: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  fixedSlotText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  fixedSlotTextSelected: {
    color: "white",
  },
});
