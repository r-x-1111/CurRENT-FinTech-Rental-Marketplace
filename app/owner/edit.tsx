import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Badge,
  Button,
  Card,
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
import { calculateOwnerPayout, CURRENT_LENDER_COMMISSION_RATE } from "../../services/deposit";
import { colors, fonts } from "../../constants/theme";
import { CROSS_STATE_ELIGIBILITY_BADGE, CROSS_STATE_ELIGIBILITY_EXPLANATION, crossStateDeliveryEligibility, selectDeliveryVehicle } from "../../services/delivery";
import { MalaysiaStateSelector } from "../../components/MalaysiaStateSelector";
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
  const state = parts.at(-1)?.startsWith("Wilayah Persekutuan") ? parts.pop()! : "";
  const locality = parts.at(-1)?.match(/^(\d{5})\s+(.+)$/);
  if (!locality) {
    return {
      line1: parts.shift() || "",
      line2: parts.join(", "),
      postcode: "",
      city: "",
      state,
    };
  }
  parts.pop();
  return {
    line1: parts.shift() || "",
    line2: parts.join(", "),
    postcode: locality[1],
    city: locality[2],
    state,
  };
}

export default function EditListing() {
  const compact = useWindowDimensions().width < 640;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, user, actAndPersist } = useMarketplace();
  const existing = state.listings.find(
    (l) => l.id === id && l.ownerId === user?.id,
  );
  const existingAddress = parseDispatchAddress(existing?.privateMeetingVenue);
  const demoAccount = state.mode === "admin_demo";
  const demoProjector = demoAccount && (!existing || existing.id === "demo-portable-projector");
  const demoAvailability = getDemoListingAvailability();

  const [title, setTitle] = useState(
    existing?.title || (demoProjector ? DEMO_LISTING_TEMPLATE.title : ""),
  );
  const [description, setDescription] = useState(
    existing?.description ||
      (demoProjector ? DEMO_LISTING_TEMPLATE.description : ""),
  );
  const [category, setCategory] = useState(
    existing?.category ||
      (demoProjector ? DEMO_LISTING_TEMPLATE.category : "Electronics"),
  );
  const [location, setLocation] = useState(
    existing?.location || (demoProjector ? DEMO_LISTING_TEMPLATE.location : ""),
  );
  
  // Dispatch address fields
  const [addressLine1, setAddressLine1] = useState(
    existingAddress.line1 ||
      (demoProjector ? DEMO_LISTING_TEMPLATE.addressLine1 : ""),
  );
  const [addressLine2, setAddressLine2] = useState(
    existingAddress.line2 ||
      (demoProjector ? DEMO_LISTING_TEMPLATE.addressLine2 : ""),
  );
  const [postcode, setPostcode] = useState(
    existingAddress.postcode ||
      (demoProjector ? DEMO_LISTING_TEMPLATE.postcode : ""),
  );
  const [city, setCity] = useState(
    existingAddress.city || (demoProjector ? DEMO_LISTING_TEMPLATE.city : ""),
  );
  const [stateName, setStateName] = useState(
    existingAddress.state ||
      (demoProjector ? DEMO_LISTING_TEMPLATE.state : ""),
  );

  const [price, setPrice] = useState(
    existing?.dailyPrice?.toString() ||
      (demoProjector ? DEMO_LISTING_TEMPLATE.dailyPrice : ""),
  );
  const [parcelWeight, setParcelWeight] = useState(existing?.parcelWeightKg?.toString() || (demoProjector ? String(DEMO_LISTING_TEMPLATE.parcelWeightKg) : ""));
  const [parcelLength, setParcelLength] = useState(existing?.parcelDimensionsCm?.length?.toString() || (demoProjector ? String(DEMO_LISTING_TEMPLATE.parcelDimensionsCm.length) : ""));
  const [parcelWidth, setParcelWidth] = useState(existing?.parcelDimensionsCm?.width?.toString() || (demoProjector ? String(DEMO_LISTING_TEMPLATE.parcelDimensionsCm.width) : ""));
  const [parcelHeight, setParcelHeight] = useState(existing?.parcelDimensionsCm?.height?.toString() || (demoProjector ? String(DEMO_LISTING_TEMPLATE.parcelDimensionsCm.height) : ""));
  const [deliveryRequirement, setDeliveryRequirement] = useState<"standard" | "fragile" | "bulky">(existing?.deliveryRequirement || (demoProjector ? DEMO_LISTING_TEMPLATE.deliveryRequirement : "standard"));
  // Cross-state shipping eligibility: additional packages (package 1 is the fields above), each
  // added/removed directly by the lender via Add Package / Remove Package — never a manually
  // typed count — plus the two independent restricted-content flags. A listing may have at most
  // 5 packages in total (package 1 + up to 4 here) and always has at least 1 (package 1, which
  // can't be removed).
  const [extraPackages, setExtraPackages] = useState<{ weight: string; length: string; width: string; height: string }[]>(
    existing?.parcelPackages?.slice(1).map((pkg) => ({
      weight: pkg.weightKg.toString(), length: pkg.dimensionsCm.length.toString(),
      width: pkg.dimensionsCm.width.toString(), height: pkg.dimensionsCm.height.toString(),
    })) || [],
  );
  const [lithiumBattery, setLithiumBattery] = useState(
    existing?.shippingCharacteristics?.includes("lithium_battery") || false,
  );
  const [restrictedLiquid, setRestrictedLiquid] = useState(
    existing?.shippingCharacteristics?.includes("restricted_liquid") || false,
  );
  const [showEligibilityInfo, setShowEligibilityInfo] = useState(false);

  const [photos, setPhotos] = useState<string[]>(
    existing?.images && existing.images.length >= 6
      ? existing.images
      : existing?.images || (existing?.imageUrl ? [existing.imageUrl] : []),
  );
  const [videos, setVideos] = useState<string[]>(
    existing?.videos && existing.videos.length >= 1
      ? existing.videos
      : existing?.videos || [],
  );

  // Availability periods
  const [periods, setPeriods] = useState<AvailabilityPeriod[]>(
    existing?.availabilityPeriods && existing.availabilityPeriods.length > 0
      ? existing.availabilityPeriods
      : existing?.availableFrom && existing?.availableTo
      ? [{ start: existing.availableFrom, end: existing.availableTo }]
      : demoProjector
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
      : demoProjector
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
  const parcelDimensions = { length: Number(parcelLength), width: Number(parcelWidth), height: Number(parcelHeight) };
  const selectedVehicle = selectDeliveryVehicle(Number(parcelWeight), parcelDimensions, deliveryRequirement);
  // All recorded packages (package 1 from the fields above, plus any extra packages) — used only
  // for the cross-state courier eligibility assessment below; same-state vehicle selection above
  // is unchanged and still driven solely by parcelWeight/parcelDimensions/deliveryRequirement.
  const allPackages = [
    { weight: parcelWeight, length: parcelLength, width: parcelWidth, height: parcelHeight },
    ...extraPackages,
  ].filter((pkg) => pkg.weight.trim() || pkg.length.trim() || pkg.width.trim() || pkg.height.trim());
  const parcelPackagesForEligibility = allPackages.length
    ? allPackages.map((pkg) => ({
        weightKg: Number(pkg.weight),
        dimensionsCm: { length: Number(pkg.length), width: Number(pkg.width), height: Number(pkg.height) },
      }))
    : undefined;
  const shippingCharacteristicsForEligibility: ("fragile" | "bulky" | "lithium_battery" | "restricted_liquid")[] = [
    ...(deliveryRequirement === "fragile" ? ["fragile" as const] : []),
    ...(deliveryRequirement === "bulky" ? ["bulky" as const] : []),
    ...(lithiumBattery ? ["lithium_battery" as const] : []),
    ...(restrictedLiquid ? ["restricted_liquid" as const] : []),
  ];
  const crossStateEligibility = crossStateDeliveryEligibility({
    parcelPackages: parcelPackagesForEligibility,
    shippingCharacteristics: shippingCharacteristicsForEligibility,
    crossStateRestricted: existing?.crossStateRestricted,
  });
  const estimatedPayout =
    !isNaN(dailyPriceNum) && dailyPriceNum > 0
      ? calculateOwnerPayout(dailyPriceNum).payout.toFixed(2)
      : "—";

  function handleAddPeriod() {
    if (!inputStart.trim() || !inputEnd.trim()) {
      setError("Please specify both Start Date and End Date.");
      return;
    }
    if (inputEnd < inputStart || (!demoAccount && (inputEnd > "2026-12-31" || inputStart > "2026-12-31"))) {
      setError(demoAccount ? "Availability must follow its start date." : "Availability must end by 31 December 2026 and follow its start date.");
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

  async function save(status: "draft" | "pending_review") {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (periods.some((period) => period.end < period.start || (!demoAccount && (period.start > "2026-12-31" || period.end > "2026-12-31")))) {
        setError(demoAccount ? "Availability must follow its start date." : "Availability must end by 31 December 2026.");
        return;
      }
      if (selectedSlots.length < 2 && status === "pending_review") {
        setError("Select at least 2 delivery time slots.");
        return;
      }

      if (periods.length === 0 && status === "pending_review") {
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

      const publicLocation = stateName.trim() && !location.toLowerCase().includes(stateName.trim().toLowerCase())
        ? `${location.trim()}, ${stateName.trim()}` : location.trim();
      const listing: Listing = {
        id: existing?.id || newId(),
        ownerId: user!.id,
        title: title.trim(),
        description: description.trim(),
        category,
        location: publicLocation,
        publicArea: publicLocation,
        privateMeetingVenue: formattedDispatchAddress,
        pickupPostcode: postcode.trim(),
        parcelWeightKg: Number(parcelWeight) > 0 ? Number(parcelWeight) : undefined,
        parcelDimensionsCm: Object.values(parcelDimensions).every((side) => Number.isFinite(side) && side > 0) ? parcelDimensions : undefined,
        // Only stored once there's more than one package — a single-package listing keeps using
        // parcelWeightKg/parcelDimensionsCm above, exactly as before.
        parcelPackages: parcelPackagesForEligibility && parcelPackagesForEligibility.length > 1 ? parcelPackagesForEligibility : undefined,
        shippingCharacteristics: shippingCharacteristicsForEligibility.length ? shippingCharacteristicsForEligibility : undefined,
        crossStateRestricted: existing?.crossStateRestricted,
        deliveryRequirement,
        dailyPrice: Number(price),
        estimatedValue:
          existing?.estimatedValue ||
          (demoProjector ? DEMO_LISTING_TEMPLATE.estimatedValue : undefined),
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
        rejectionReason: undefined,
        featuredUntil: existing?.featuredUntil,
        deliveryTimeSlots: selectedSlots,
        pickupTimeWindows: selectedSlots.map((s) => ({ start: s, end: s })),
      };
      await actAndPersist({
        type: "saveListing",
        listing,
      });
      router.replace(
        status === "pending_review"
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
      contentStyle={styles.screenContent}
    >
      <View style={styles.pageHeading}>
        <Text accessibilityRole="header" style={[styles.pageTitle, compact && styles.pageTitleCompact]}>Give your gear a second life</Text>
        <Text style={styles.pageSubtitle}>A few details today. A little extra income tomorrow.</Text>
      </View>
      <Card style={[styles.formCard, compact && styles.formCardCompact]}>
        {/* Media Upload Section: Min 6 photos and 1 video required per V3.23 */}
        <View style={styles.formSection}>
        <Text style={styles.sectionHeading}>Listing Media (Photos & Video)</Text>
        <MediaPicker
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
        </View>

        <View style={styles.formSection}>
        <Text style={styles.sectionHeading}>Basic Listing Information</Text>
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
        </View>

        <View style={styles.formSection}>
        <Text style={styles.sectionHeading}>Category</Text>
        <View style={styles.optionGrid}>
          {categories.slice(1).map((option) => (
            <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: category === option }}
              onPress={() => setCategory(option)} style={[styles.optionButton, category === option && styles.optionButtonSelected]}>
              <Text style={[styles.optionText, category === option && styles.optionTextSelected]}>{option}</Text>
            </Pressable>
          ))}
        </View>
        </View>

        {/* Public service area and dispatch address */}
        <View style={styles.formSection}>
        <Text style={styles.sectionHeading}>Service Area and Address</Text>
        <Field
          label="Service area / locality"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g. Petaling Jaya"
        />

        <View style={styles.addressBox}>
          <Text style={styles.subsectionHeading}>Pickup Address</Text>

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
          <View style={[styles.inputRow, compact && styles.inputRowCompact]}>
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
          <MalaysiaStateSelector value={stateName} onChange={setStateName} />
        </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionHeading}>Delivery & Shipping Information</Text>
          <Text style={s.caption}>Provide your item's packaged measurements so CurRENT can automatically determine available delivery options.</Text>

          <Text style={styles.subsectionHeading}>Package Details</Text>
          <Text style={styles.packageSummary}>{extraPackages.length + 1} {extraPackages.length === 0 ? "package" : "packages"} selected</Text>
          <View style={styles.packageCard}>
          <Text style={styles.packageTitle}>Package 1</Text>
          <Field label="Package weight (kg)" value={parcelWeight} onChangeText={setParcelWeight} keyboardType="decimal-pad" placeholder="e.g. 2.5" />
          <View style={[styles.inputRow, compact && styles.inputRowCompact]}>
            <View style={{ flex: 1 }}><Field label="Length (cm)" value={parcelLength} onChangeText={setParcelLength} keyboardType="decimal-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Width (cm)" value={parcelWidth} onChangeText={setParcelWidth} keyboardType="decimal-pad" /></View>
            <View style={{ flex: 1 }}><Field label="Height (cm)" value={parcelHeight} onChangeText={setParcelHeight} keyboardType="decimal-pad" /></View>
          </View>
          </View>
          {extraPackages.map((pkg, index) => (
            <View key={index} style={styles.packageCard}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={styles.packageTitle}>Package {index + 2}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove package ${index + 2}`}
                  onPress={() => setExtraPackages((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 12 }}>Remove Package</Text>
                </Pressable>
              </View>
              <Field label="Package weight (kg)" value={pkg.weight}
                onChangeText={(value) => setExtraPackages((prev) => prev.map((p, i) => i === index ? { ...p, weight: value } : p))}
                keyboardType="decimal-pad" placeholder="e.g. 2.5" />
              <View style={[styles.inputRow, compact && styles.inputRowCompact]}>
                <View style={{ flex: 1 }}><Field label="Length (cm)" value={pkg.length}
                  onChangeText={(value) => setExtraPackages((prev) => prev.map((p, i) => i === index ? { ...p, length: value } : p))}
                  keyboardType="decimal-pad" /></View>
                <View style={{ flex: 1 }}><Field label="Width (cm)" value={pkg.width}
                  onChangeText={(value) => setExtraPackages((prev) => prev.map((p, i) => i === index ? { ...p, width: value } : p))}
                  keyboardType="decimal-pad" /></View>
                <View style={{ flex: 1 }}><Field label="Height (cm)" value={pkg.height}
                  onChangeText={(value) => setExtraPackages((prev) => prev.map((p, i) => i === index ? { ...p, height: value } : p))}
                  keyboardType="decimal-pad" /></View>
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: extraPackages.length >= 4 }}
            disabled={extraPackages.length >= 4}
            onPress={() => setExtraPackages((prev) => [...prev, { weight: "", length: "", width: "", height: "" }])}
          >
            <Text style={{ color: extraPackages.length >= 4 ? colors.muted : colors.blue, fontWeight: "700", fontSize: 12 }}>
              {extraPackages.length >= 4 ? "Maximum 5 packages reached" : "+ Add Package"}
            </Text>
          </Pressable>

          <Text style={styles.subsectionHeading}>Shipping Characteristics</Text>
          <Text style={s.label}>Delivery requirement</Text>
          <View style={styles.optionGrid}>
            {(["standard", "fragile", "bulky"] as const).map((option) => (
              <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: deliveryRequirement === option }}
                onPress={() => setDeliveryRequirement(option)} style={[styles.optionButton, deliveryRequirement === option && styles.optionButtonSelected]}>
                <Text style={[styles.optionText, deliveryRequirement === option && styles.optionTextSelected]}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: lithiumBattery }}
            onPress={() => setLithiumBattery((v) => !v)} style={styles.shippingCheckboxRow}>
            <View style={[styles.shippingCheckbox, lithiumBattery && styles.shippingCheckboxChecked]}>
              {lithiumBattery && <Ionicons name="checkmark" size={13} color={colors.white} />}
            </View>
            <Text style={s.caption}>Contains lithium batteries</Text>
          </Pressable>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: restrictedLiquid }}
            onPress={() => setRestrictedLiquid((v) => !v)} style={styles.shippingCheckboxRow}>
            <View style={[styles.shippingCheckbox, restrictedLiquid && styles.shippingCheckboxChecked]}>
              {restrictedLiquid && <Ionicons name="checkmark" size={13} color={colors.white} />}
            </View>
            <Text style={s.caption}>Contains liquids or restricted materials</Text>
          </Pressable>
          <Text style={s.caption}>{selectedVehicle ? `Automatically selected: ${selectedVehicle}` : "Vehicle will be inferred from the listing."}</Text>

          {/* Automatic cross-state eligibility result — recalculated on every relevant change,
              never a lender-editable toggle. */}
          <View style={styles.eligibilityResultBox}>
            <Badge
              text={CROSS_STATE_ELIGIBILITY_BADGE[crossStateEligibility]}
              tone={crossStateEligibility === "available" ? "green" : crossStateEligibility === "same_state_only" ? "amber" : "blue"}
            />
            <Text style={s.caption}>{CROSS_STATE_ELIGIBILITY_EXPLANATION[crossStateEligibility]}</Text>
          </View>

          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showEligibilityInfo }} onPress={() => setShowEligibilityInfo((v) => !v)} style={styles.accordionTrigger}>
            <Text style={styles.accordionText}>
              {showEligibilityInfo ? "Hide" : "How Is Delivery Eligibility Determined?"}
            </Text>
            <Ionicons name={showEligibilityInfo ? "chevron-up" : "chevron-down"} size={16} color={colors.blue} />
          </Pressable>
          {showEligibilityInfo && (
            <Text style={s.caption}>
              CurRENT automatically assesses cross-state delivery eligibility using the item's packaged weight, dimensions and shipping characteristics. Items that meet the supported courier requirements may be offered for cross-state delivery. All assessments are simulated and do not guarantee acceptance by an actual courier.
            </Text>
          )}
        </View>

        <View style={styles.formSection}>
        <Text style={styles.sectionHeading}>Rental Pricing</Text>
        <Field
          label="Daily rental price (RM)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="e.g. 45.00"
        />

        {/* Read-only estimated payout at the current commission rate. */}
        <View style={styles.payoutContainer}>
          <Text style={s.label}>Estimated payout (RM/day)</Text>
          <View style={styles.payoutBox}>
            <Text style={styles.payoutValue}>
              {estimatedPayout !== "—" ? `RM ${estimatedPayout}` : "—"}
            </Text>
            <Text style={styles.payoutSub}>{Math.round((1 - CURRENT_LENDER_COMMISSION_RATE) * 100)}% of daily price</Text>
          </View>
        </View>

        {/* Existing pale-blue commission notice. */}
        <View style={styles.commissionNoticeBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.navy} />
          <Text style={styles.commissionNoticeText}>
            CurRENT charges a {Math.round(CURRENT_LENDER_COMMISSION_RATE * 100)}% commission only when a rental is successfully completed. Your payout will be released once the deposit has been settled.
          </Text>
        </View>
        </View>

        {/* Compact Availability Section (Section 4.3) */}
        <View style={styles.formSection}>
          <Text style={styles.sectionHeading}>Availability</Text>
          <Text style={[s.caption, { marginBottom: 10 }]}>
            Set the date ranges when your item is available for rent.
          </Text>

          {/* Current saved periods */}
          {periods.length > 0 && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              {periods.map((p, idx) => (
                <View key={`${p.start}-${p.end}-${idx}`} style={[styles.periodRow, compact && styles.periodRowCompact]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                    <Ionicons name="calendar-outline" size={16} color={colors.blue} />
                    <Text style={styles.periodDateText}>
                      {formatAvailabilityDate(p.start)} – {formatAvailabilityDate(p.end)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
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
            <View style={[styles.inputRow, compact && styles.inputRowCompact]}>
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
                  disabled={!demoAccount && calendarYear >= 2026 && calendarMonthIndex >= 11}
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
                            accessibilityState={{ selected, disabled: calendarSelector === "year" && !demoAccount && choice > 2026 }}
                            disabled={calendarSelector === "year" && !demoAccount && choice > 2026}
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
                                calendarSelector === "year" && !demoAccount && choice > 2026 && { color: colors.muted, opacity: 0.45 },
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
                        disabled: date < earliestCalendarDate || (!demoAccount && date > "2026-12-31"),
                      }}
                      disabled={date < earliestCalendarDate || (!demoAccount && date > "2026-12-31")}
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
                          (date < earliestCalendarDate || (!demoAccount && date > "2026-12-31")) && styles.calendarDayDisabled,
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
        <View style={styles.formSection}>
          <View style={[styles.sectionHeaderRow, compact && styles.sectionHeaderRowCompact]}>
            <Text style={styles.sectionHeading}>Available Delivery Time Slots</Text>
            <Text style={[styles.countBadge, selectedSlots.length < 2 && styles.countBadgeWarning]}>
              {selectedSlots.length}/8 selected (min 2 required)
            </Text>
          </View>
          <Text style={styles.subsectionHeading}>Local Delivery – GrabExpress (Demo)</Text>
          <Text style={styles.supportingText}>Select at least 2 of the 8 fixed delivery-start hours. Renters using eligible local delivery routes can only book during your selected time slots.</Text>
          <Text style={styles.supportingText}>For each selected delivery time, the delivery driver is scheduled to collect the item from you approximately 40 minutes before the renter's selected delivery time. For example, if the renter selects 2:00 PM, the estimated driver collection time is 1:20 PM.</Text>
          <Text style={styles.disclaimerText}>These are simulated schedules, not confirmed GrabExpress bookings.</Text>
          <Text style={styles.subsectionHeading}>Cross-State Delivery – Domestic Courier (Demo)</Text>
          <Text style={styles.supportingText}>Fixed hourly delivery slots do not apply to cross-state deliveries. Instead, CurRENT automatically recommends a dispatch date based on the renter's selected rental start date and the estimated courier transit time.</Text>
          <Text style={styles.supportingText}>After receiving a cross-state booking, you will be asked to confirm the recommended dispatch date or propose an alternative arrangement.</Text>
          <Text style={styles.supportingText}>For returns, the renter must drop off the securely packaged item at an eligible courier branch by the agreed return deadline. Courier arrival dates are estimates and are not guaranteed.</Text>
          <Text style={styles.disclaimerText}>
            The renter's delivery postcode is not known yet, so whether a booking uses local or cross-state delivery is determined later, at checkout.
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
        <View style={styles.formSection}>
          <Text style={styles.sectionHeading}>Fulfilment Method</Text>
          <View style={styles.deliveryOnlyBadge}>
            <Ionicons name="car-outline" size={16} color={colors.blue} />
            <Text style={styles.deliveryOnlyText}>Delivery Only</Text>
          </View>
          <Text style={s.caption}>
            All CurRENT items use Delivery Only. Lenders arrange direct dispatch to the renter's private address upon booking confirmation.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionHeading}>Submit Listing for Review</Text>
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
            disabled={!canPublish || isSaving}
            onPress={() => void save("pending_review")}
          >
            Submit Listing for Review
          </Button>
          <Button secondary disabled={isSaving} onPress={() => void save("draft")}>
            Save as draft
          </Button>
        </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: { maxWidth: 920 },
  pageHeading: { marginBottom: 22, gap: 6 },
  pageTitle: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 39, fontWeight: "700", letterSpacing: -0.5, color: "#102B50" },
  pageTitleCompact: { fontSize: 27, lineHeight: 34 },
  pageSubtitle: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.muted },
  formCard: { gap: 16, padding: 18 },
  formCardCompact: { padding: 12, gap: 12 },
  formSection: {
    backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1,
    borderRadius: 14, padding: 16, gap: 8,
  },
  sectionHeading: {
    fontFamily: fonts.bold, fontSize: 20, lineHeight: 27, fontWeight: "600",
    color: "#102B50", marginBottom: 4,
  },
  subsectionHeading: {
    fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, fontWeight: "600",
    color: "#102B50", marginTop: 10, marginBottom: 4,
  },
  inputRow: { flexDirection: "row", gap: 10 },
  inputRowCompact: { flexDirection: "column" },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionButton: {
    minHeight: 44, minWidth: 108, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  optionButtonSelected: { borderColor: "#2563EB", backgroundColor: "#2563EB" },
  optionText: { fontFamily: fonts.medium, fontSize: 14, fontWeight: "600", color: "#102B50", textAlign: "center" },
  optionTextSelected: { color: colors.white },
  packageSummary: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 19, color: colors.muted },
  packageCard: {
    padding: 14, gap: 6, borderRadius: 12, borderWidth: 1,
    borderColor: colors.border, backgroundColor: "#E4EEFA",
  },
  packageTitle: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#102B50" },
  accordionTrigger: {
    minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.white,
  },
  accordionText: { fontFamily: fonts.medium, fontSize: 13, fontWeight: "600", color: "#2563EB" },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectionHeaderRowCompact: { flexDirection: "column", alignItems: "flex-start" },
  countBadge: {
    fontFamily: fonts.medium, fontSize: 12, lineHeight: 18, fontWeight: "600",
    color: "#102B50", backgroundColor: "#E4EEFA", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden",
  },
  countBadgeWarning: { color: colors.danger },
  supportingText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.muted },
  disclaimerText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: colors.muted, fontStyle: "italic" },
  shippingCheckboxRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  shippingCheckbox: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center",
  },
  shippingCheckboxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
  eligibilityResultBox: {
    backgroundColor: "#E4EEFA", borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, padding: 12, gap: 6, marginTop: 8,
  },
  payoutContainer: {
    gap: 7,
    marginBottom: 10,
  },
  payoutBox: {
    backgroundColor: "#E4EEFA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    justifyContent: "space-between",
  },
  payoutValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#102B50",
  },
  payoutSub: {
    fontSize: 13,
    color: colors.slate,
    fontWeight: "600",
  },
  commissionNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E4EEFA",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.softBlue,
    marginBottom: 14,
  },
  commissionNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.navy,
    lineHeight: 18,
  },
  addressBox: {
    backgroundColor: "#E4EEFA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.softBlue,
    padding: 14,
    marginBottom: 0,
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E4EEFA",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodRowCompact: { flexDirection: "column", alignItems: "stretch", gap: 10 },
  periodDateText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navy,
  },
  periodActionBtn: {
    minHeight: 40,
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
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
    backgroundColor: "#E4EEFA",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addAvailabilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    backgroundColor: colors.paleBlue,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.softBlue,
  },
  addAvailabilityText: {
    color: colors.blue,
    fontSize: 14,
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
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
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
