import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
import type { AvailabilityPeriod, Listing } from "../../types";
import {
  DEMO_LISTING_TEMPLATE,
  getDemoListingAvailability,
} from "../../services/demoWorkspaceDefaults";
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

function formatAvailabilityDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseDispatchAddress(address = "") {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const locality = parts.at(-1)?.match(/^(\d{5})\s+(.+)$/);
  if (!locality) {
    return {
      line1: parts.shift() || "",
      line2: parts.join(", "),
      postcode: "",
      city: "",
      state: "",
    };
  }
  parts.pop();
  return {
    line1: parts.shift() || "",
    line2: parts.join(", "),
    postcode: locality[1],
    city: locality[2],
    state: "",
  };
}

export default function EditListing() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, user, actAndPersist } = useMarketplace();
  const existing = state.listings.find(
    (l) => l.id === id && l.ownerId === user?.id,
  );
  const existingAddress = parseDispatchAddress(existing?.privateMeetingVenue);
  const demoAccount = state.mode === "admin_demo";
  const demoAvailability = getDemoListingAvailability();

  const [title, setTitle] = useState(
    existing?.title || (demoAccount ? DEMO_LISTING_TEMPLATE.title : ""),
  );
  const [description, setDescription] = useState(
    existing?.description ||
      (demoAccount ? DEMO_LISTING_TEMPLATE.description : ""),
  );
  const [category, setCategory] = useState(
    existing?.category ||
      (demoAccount ? DEMO_LISTING_TEMPLATE.category : "Electronics"),
  );
  const [location, setLocation] = useState(
    existing?.location || (demoAccount ? DEMO_LISTING_TEMPLATE.location : ""),
  );
  
  // Dispatch address fields
  const [addressLine1, setAddressLine1] = useState(
    existingAddress.line1 ||
      (demoAccount ? DEMO_LISTING_TEMPLATE.addressLine1 : ""),
  );
  const [addressLine2, setAddressLine2] = useState(
    existingAddress.line2 ||
      (demoAccount ? DEMO_LISTING_TEMPLATE.addressLine2 : ""),
  );
  const [postcode, setPostcode] = useState(
    existingAddress.postcode ||
      (demoAccount ? DEMO_LISTING_TEMPLATE.postcode : ""),
  );
  const [city, setCity] = useState(
    existingAddress.city || (demoAccount ? DEMO_LISTING_TEMPLATE.city : ""),
  );
  const [stateName, setStateName] = useState(
    existingAddress.state ||
      (demoAccount ? DEMO_LISTING_TEMPLATE.state : ""),
  );

  const [price, setPrice] = useState(
    existing?.dailyPrice?.toString() ||
      (demoAccount ? DEMO_LISTING_TEMPLATE.dailyPrice : ""),
  );
  
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
      : demoAccount
        ? [{ start: demoAvailability.start, end: demoAvailability.end }]
        : [],
  );
  const [inputStart, setInputStart] = useState("");
  const [inputEnd, setInputEnd] = useState("");
  const [editingPeriodIndex, setEditingPeriodIndex] = useState<number | null>(
    null,
  );
  const [calendarField, setCalendarField] = useState<"start" | "end" | null>(
    null,
  );
  const [calendarSelector, setCalendarSelector] = useState<
    "month" | "year" | null
  >(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // 8 Fixed Delivery Slots (README V3.23 Section 4.3 & 17.8)
  const initialSlots =
    existing?.deliveryTimeSlots && existing.deliveryTimeSlots.length > 0
      ? existing.deliveryTimeSlots
      : existing?.pickupTimeWindows && existing.pickupTimeWindows.length > 0
      ? existing.pickupTimeWindows.map((w) => w.start)
      : demoAccount
        ? DEMO_LISTING_TEMPLATE.deliveryTimeSlots
        : [];
  const [selectedSlots, setSelectedSlots] = useState<string[]>(initialSlots);


  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (user.verification !== "verified" || typeof user.riskScore !== "number") {
    return (
      <Screen
        back
        title="Listing"
        subtitle="Listing management is locked for this account."
      >
        <Card>
          <Text style={s.h2}>
            Complete Identity Verification to manage listings.
          </Text>
          <Notice text="Complete Identity Verification to create or publish a listing." />
          <Button onPress={() => router.push({ pathname: "/(tabs)/profile", params: { section: "ekyc" } })}>
            Complete Identity Verification
          </Button>
        </Card>
      </Screen>
    );
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
    if (inputEnd < inputStart || inputEnd > "2026-12-31" || inputStart > "2026-12-31") {
      setError("Availability must end by 31 December 2026 and follow its start date.");
      return;
    }
    setError("");
    const updatedPeriod = { start: inputStart.trim(), end: inputEnd.trim() };
    setPeriods((prev) =>
      editingPeriodIndex === null
        ? [...prev, updatedPeriod]
        : prev.map((period, index) =>
            index === editingPeriodIndex ? updatedPeriod : period,
          ),
    );
    setEditingPeriodIndex(null);
    setInputStart("");
    setInputEnd("");
  }

  function openCalendar(field: "start" | "end") {
    const value = field === "start" ? inputStart : inputEnd;
    const selectedDate = value ? new Date(`${value}T12:00:00`) : new Date();
    setCalendarMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
    setCalendarSelector(null);
    setCalendarField(field);
  }

  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const calendarMonthLength = new Date(
    calendarYear,
    calendarMonthIndex + 1,
    0,
  ).getDate();
  const calendarFirstWeekday = new Date(
    calendarYear,
    calendarMonthIndex,
    1,
  ).getDay();
  const calendarMondayOffset = (calendarFirstWeekday + 6) % 7;
  const calendarCells = Array.from({ length: 42 }, (_, index) => {
    const day = index - calendarMondayOffset + 1;
    if (day < 1 || day > calendarMonthLength) return null;
    return `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const earliestCalendarDate =
    calendarField === "end" && inputStart ? inputStart : todayKey;

  function handleRemovePeriod(index: number) {
    setPeriods((prev) => prev.filter((_, i) => i !== index));
    if (editingPeriodIndex === index) {
      setEditingPeriodIndex(null);
      setInputStart("");
      setInputEnd("");
    } else if (editingPeriodIndex !== null && index < editingPeriodIndex) {
      setEditingPeriodIndex(editingPeriodIndex - 1);
    }
  }

  function handleEditPeriod(index: number) {
    const p = periods[index];
    if (p) {
      setEditingPeriodIndex(index);
      setInputStart(p.start);
      setInputEnd(p.end);
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

  async function save(status: "draft" | "published") {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (periods.some((period) => period.start > "2026-12-31" || period.end > "2026-12-31" || period.end < period.start)) {
        setError("Availability must end by 31 December 2026.");
        return;
      }
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

      const listing: Listing = {
        id: existing?.id || newId(),
        ownerId: user!.id,
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        publicArea: location.trim(),
        privateMeetingVenue: formattedDispatchAddress,
        dailyPrice: Number(price),
        estimatedValue:
          existing?.estimatedValue ||
          (demoAccount ? DEMO_LISTING_TEMPLATE.estimatedValue : undefined),
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
        featuredUntil: existing?.featuredUntil,
        deliveryTimeSlots: selectedSlots,
        pickupTimeWindows: selectedSlots.map((s) => ({ start: s, end: s })),
      };
      await actAndPersist({
        type: "saveListing",
        listing,
      });
      router.replace(
        status === "published"
          ? { pathname: "/owner", params: { published: "1" } }
          : "/owner",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  const canPublish =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    location.trim().length > 0 &&
    addressLine1.trim().length > 0 &&
    postcode.trim().length > 0 &&
    city.trim().length > 0 &&
    stateName.trim().length > 0 &&
    dailyPriceNum > 0 &&
    (demoAccount || photos.length >= 6) &&
    (demoAccount || videos.length >= 1) &&
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
          subtitle={
            demoAccount
              ? "Media is optional for the Demo Account."
              : "Publishing requires at least 6 photos and 1 video. Upload clear pictures of your item, accessories, and a short functional video."
          }
          photos={photos}
          onPhotosChange={setPhotos}
          videos={videos}
          onVideosChange={setVideos}
          minPhotos={demoAccount ? 0 : 6}
          maxPhotos={10}
          minVideos={demoAccount ? 0 : 1}
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

        {/* Public service area and dispatch address */}
        <Field
          label="Service area / locality"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Petaling Jaya"
        />

        <View style={styles.addressBox}>
          <Text style={[s.label, { marginBottom: 10 }]}>Address</Text>

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
                      {formatAvailabilityDate(p.start)} – {formatAvailabilityDate(p.end)}
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
                <Text style={s.label}>Start Date</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Choose start date${inputStart ? `, ${inputStart}` : ""}`}
                  onPress={() => openCalendar("start")}
                  style={styles.datePickerTrigger}
                >
                  <Ionicons name="calendar-outline" size={17} color={colors.blue} />
                  <Text style={styles.datePickerTriggerText}>
                    {inputStart ? formatAvailabilityDate(inputStart) : "Choose date"}
                  </Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>End Date</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Choose end date${inputEnd ? `, ${inputEnd}` : ""}`}
                  onPress={() => openCalendar("end")}
                  style={styles.datePickerTrigger}
                >
                  <Ionicons name="calendar-outline" size={17} color={colors.blue} />
                  <Text style={styles.datePickerTriggerText}>
                    {inputEnd ? formatAvailabilityDate(inputEnd) : "Choose date"}
                  </Text>
                </Pressable>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handleAddPeriod}
              style={styles.addAvailabilityBtn}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.blue} />
              <Text style={styles.addAvailabilityText}>
                {editingPeriodIndex === null
                  ? "+ Add Availability"
                  : "Update Availability"}
              </Text>
            </Pressable>
          </View>
        </View>

        <Modal
          transparent
          visible={calendarField !== null}
          animationType="fade"
          onRequestClose={() => {
            setCalendarField(null);
            setCalendarSelector(null);
          }}
        >
          <View style={styles.calendarBackdrop}>
            <View
              accessibilityViewIsModal
              style={styles.calendarPanel}
            >
              <View style={styles.calendarHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  disabled={
                    calendarYear < today.getFullYear() ||
                    (calendarYear === today.getFullYear() &&
                      calendarMonthIndex <= today.getMonth())
                  }
                  onPress={() =>
                    setCalendarMonth(
                      new Date(calendarYear, calendarMonthIndex - 1, 1),
                    )
                  }
                  style={styles.calendarNavButton}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.blue} />
                </Pressable>
                <View style={styles.calendarSelectors}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Select month, ${calendarMonth.toLocaleDateString("en-MY", { month: "long" })}`}
                    onPress={() => setCalendarSelector("month")}
                    style={styles.calendarSelectorButton}
                  >
                    <Text style={styles.calendarMonthTitle}>
                      {calendarMonth.toLocaleDateString("en-MY", {
                        month: "short",
                      })}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Select year, ${calendarYear}`}
                    onPress={() => setCalendarSelector("year")}
                    style={styles.calendarSelectorButton}
                  >
                    <Text style={styles.calendarMonthTitle}>{calendarYear}</Text>
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  disabled={calendarYear >= 2026 && calendarMonthIndex >= 11}
                  onPress={() =>
                    setCalendarMonth(
                      new Date(calendarYear, calendarMonthIndex + 1, 1),
                    )
                  }
                  style={styles.calendarNavButton}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.blue} />
                </Pressable>
              </View>
              {calendarSelector ? (
                <>
                  <Text style={styles.calendarSelectorHeading}>
                    Select {calendarSelector}
                  </Text>
                  <ScrollView style={styles.calendarChoicesScroll}>
                    <View style={styles.calendarChoices}>
                      {(calendarSelector === "month"
                        ? Array.from({ length: 12 }, (_, index) => index)
                        : Array.from(
                            { length: 31 },
                            (_, index) => new Date().getFullYear() + index,
                          )
                      ).map((choice) => {
                        const selected =
                          calendarSelector === "month"
                            ? choice === calendarMonthIndex
                            : choice === calendarYear;
                        const label =
                          calendarSelector === "month"
                            ? new Date(2020, choice, 1).toLocaleDateString(
                                "en-MY",
                                { month: "long" },
                              )
                            : String(choice);
                        return (
                          <Pressable
                            key={choice}
                            accessibilityRole="button"
                            accessibilityState={{ selected, disabled: calendarSelector === "year" && choice > 2026 }}
                            disabled={calendarSelector === "year" && choice > 2026}
                            onPress={() => {
                              setCalendarMonth(
                                calendarSelector === "month"
                                  ? new Date(calendarYear, choice, 1)
                                  : new Date(choice, calendarMonthIndex, 1),
                              );
                              setCalendarSelector(null);
                            }}
                            style={[
                              styles.calendarChoice,
                              selected && styles.calendarChoiceSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.calendarChoiceText,
                                selected && styles.calendarChoiceTextSelected,
                                calendarSelector === "year" && choice > 2026 && { color: colors.muted, opacity: 0.45 },
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </ScrollView>
                </>
              ) : (
              <View style={styles.calendarGrid}>
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <Text
                    key={`${day}-${index}`}
                    accessibilityLabel={
                      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index]
                    }
                    style={styles.calendarWeekday}
                  >
                    {day}
                  </Text>
                ))}
                {calendarCells.map((date, index) =>
                  date ? (
                    <Pressable
                      key={date}
                      accessibilityRole="button"
                      accessibilityLabel={new Date(`${date}T12:00:00`).toLocaleDateString(
                        "en-MY",
                        { dateStyle: "full" },
                      )}
                      accessibilityState={{
                        selected:
                          date ===
                          (calendarField === "start" ? inputStart : inputEnd),
                        disabled: date < earliestCalendarDate || date > "2026-12-31",
                      }}
                      disabled={date < earliestCalendarDate || date > "2026-12-31"}
                      onPress={() => {
                        if (calendarField === "start") setInputStart(date);
                        else setInputEnd(date);
                        setCalendarField(null);
                      }}
                      style={[
                        styles.calendarDay,
                        date ===
                          (calendarField === "start" ? inputStart : inputEnd) &&
                          styles.calendarDaySelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          date ===
                            (calendarField === "start" ? inputStart : inputEnd) &&
                            styles.calendarDayTextSelected,
                          (date < earliestCalendarDate || date > "2026-12-31") && styles.calendarDayDisabled,
                        ]}
                      >
                        {Number(date.slice(-2))}
                      </Text>
                    </Pressable>
                  ) : (
                    <View key={`empty-${index}`} style={styles.calendarDay} />
                  ),
                )}
              </View>
              )}
              <Button
                secondary
                onPress={() => {
                  if (calendarSelector) setCalendarSelector(null);
                  else setCalendarField(null);
                }}
              >
                {calendarSelector ? "Back to calendar" : "Cancel"}
              </Button>
            </View>
          </View>
        </Modal>

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
          <Text style={[s.caption, { color: colors.navy, marginBottom: 10 }]}>
            For each delivery time selected below, the delivery driver will arrive 40 minutes earlier to collect the item from you.
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
            disabled={!canPublish || isSaving}
            onPress={() => void save("published")}
          >
            Publish Listing
          </Button>
          <Button secondary disabled={isSaving} onPress={() => void save("draft")}>
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
    backgroundColor: colors.paleBlue,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
  addressBox: {
    backgroundColor: colors.paleBlue,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.softBlue,
    padding: 14,
    marginBottom: 14,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.paleBlue,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.paleBlue,
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
  datePickerTrigger: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: "white",
    marginTop: 7,
    marginBottom: 14,
  },
  datePickerTriggerText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
  },
  calendarBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  calendarPanel: {
    width: "100%",
    maxWidth: 380,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "white",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarNavButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.paleBlue,
  },
  calendarMonthTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "800",
  },
  calendarSelectors: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calendarSelectorButton: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: colors.paleBlue,
  },
  calendarSelectorHeading: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  calendarChoicesScroll: {
    maxHeight: 320,
    marginBottom: 12,
  },
  calendarChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calendarChoice: {
    width: "31%",
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: "white",
  },
  calendarChoiceSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blue,
  },
  calendarChoiceText: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "600",
  },
  calendarChoiceTextSelected: {
    color: "white",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  calendarWeekday: {
    width: "14.2857%",
    textAlign: "center",
    color: colors.slate,
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 8,
  },
  calendarDay: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  calendarDaySelected: {
    backgroundColor: colors.blue,
  },
  calendarDayText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
  },
  calendarDayTextSelected: {
    color: "white",
    fontWeight: "800",
  },
  calendarDayDisabled: {
    color: colors.muted,
  },
});
