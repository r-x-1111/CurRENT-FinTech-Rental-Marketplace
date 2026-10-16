import { useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Badge,
  Button,
  Card,
  Chips,
  Empty,
  Notice,
  Row,
  Screen,
  Section,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import {
  availability,
  availabilityCalendar,
  demoSlotAvailable,
  isDemoSeededListing,
  dateAfter,
  formatMalaysiaDateTime,
  malaysiaDateKey,
  malaysiaTimeKey,
  money,
  parseMalaysiaTimestamp,
  quoteFor,
  rentalDays,
  riskFor,
  toMalaysiaUtcTimestamp,
} from "../../services/booking";
import { colors } from "../../constants/theme";
import type { CollectionMethod } from "../../types";
import { newId } from "../../services/marketplace";
import { GuestAuthPrompt } from "../../components/GuestAuth";
import { MalaysiaStateSelector } from "../../components/MalaysiaStateSelector";

export const FIXED_DELIVERY_SLOTS = [
  { value: "10:00", label: "10:00 AM", shortLabel: "10 AM" },
  { value: "11:00", label: "11:00 AM", shortLabel: "11 AM" },
  { value: "12:00", label: "12:00 PM", shortLabel: "12 PM" },
  { value: "13:00", label: "1:00 PM", shortLabel: "1 PM" },
  { value: "14:00", label: "2:00 PM", shortLabel: "2 PM" },
  { value: "15:00", label: "3:00 PM", shortLabel: "3 PM" },
  { value: "16:00", label: "4:00 PM", shortLabel: "4 PM" },
  { value: "17:00", label: "5:00 PM", shortLabel: "5 PM" },
];

function formatTime(timeStr: string) {
  const [h, m] = (timeStr || "11:00").split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin = m || "00";
  return `${displayHour < 10 ? `0${displayHour}` : displayHour}:${displayMin} ${ampm}`;
}

function formatHourAmPm(timeStr: string) {
  const [h] = (timeStr || "11:00").split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${ampm}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function ListingDetailScreen() {
  const { id, checkoutId } = useLocalSearchParams<{ id: string; checkoutId?: string }>();
  const { state, user, act, actAndPersist } = useMarketplace();
  const listing = state.listings.find((l) => l.id === id);
  const checkoutBooking = state.bookings.find((booking) =>
    booking.id === checkoutId && booking.renterId === user?.id && booking.listingId === id && booking.status === "payment_required");
  // 8 Fixed Delivery Slots filtered by lender's selection (Section 4.3, 7.1, 17.8)
  const availableSlots = FIXED_DELIVERY_SLOTS.filter((opt) => {
    if (!listing) return true;
    if (listing.deliveryTimeSlots && listing.deliveryTimeSlots.length > 0) {
      return listing.deliveryTimeSlots.includes(opt.value);
    }
    if (listing.pickupTimeWindows && listing.pickupTimeWindows.length > 0) {
      return listing.pickupTimeWindows.some(
        (w) => w.start === opt.value || (w.start <= opt.value && opt.value <= w.end),
      );
    }
    return true;
  });

  const [start, setStart] = useState(checkoutBooking ? malaysiaDateKey(checkoutBooking.start) : dateAfter(1));
  const [end, setEnd] = useState(checkoutBooking ? malaysiaDateKey(checkoutBooking.end) : dateAfter(3));
  const slotUnavailable = (slot: string) => {
    if (state.mode !== "admin_demo" || !listing || !isDemoSeededListing(listing.id) || !start) return false;
    const lastDate = end && end > start ? end : new Date(Date.parse(`${start}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
    for (let date = start; date < lastDate; date = new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)) {
      if (!demoSlotAvailable(listing.id, date, slot)) return true;
    }
    return false;
  };
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(`${dateAfter(1).slice(0, 7)}-01T00:00:00Z`),
  );
  const [calendarPicker, setCalendarPicker] = useState<"month" | "year" | null>(
    null,
  );
  const [pickupTime, setPickupTime] = useState(checkoutBooking ? malaysiaTimeKey(checkoutBooking.start) : "");
  const effectivePickupTime =
    pickupTime && availableSlots.some((s) => s.value === pickupTime) && !slotUnavailable(pickupTime)
      ? pickupTime
      : availableSlots.find((slot) => !slotUnavailable(slot.value))?.value || availableSlots[0]?.value || "11:00";
  // Return time is strictly auto-matched and locked to pickup time per 24-hour rental rules
  const returnTime = effectivePickupTime;
  const [collectionMethod, setCollectionMethod] =
    useState<CollectionMethod>("Delivery");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Demo FPX");
  const [showCheckout, setShowCheckout] = useState(Boolean(checkoutBooking));
  const [isPaying, setIsPaying] = useState(false);
  const payInProgress = useRef(false);
  const [error, setError] = useState("");
  const [authPrompt, setAuthPrompt] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");
  const [photo, setPhoto] = useState("");

  // Delivery Address state per README V3.23 Section 7.2
  const [recipientName, setRecipientName] = useState(user?.savedDeliveryAddress?.recipientName || user?.name || "");
  const [deliveryPhone, setDeliveryPhone] = useState(user?.savedDeliveryAddress?.phone || user?.phone || "");
  const [streetAddress, setStreetAddress] = useState(user?.savedDeliveryAddress?.addressLine1 || "");
  const [unit, setUnit] = useState(user?.savedDeliveryAddress?.addressLine2 || "");
  const [postcode, setPostcode] = useState(user?.savedDeliveryAddress?.postcode || "");
  const [city, setCity] = useState(user?.savedDeliveryAddress?.city || "");
  const [stateName, setStateName] = useState(user?.savedDeliveryAddress?.state || "");
  const [deliveryNotes, setDeliveryNotes] = useState(user?.savedDeliveryAddress?.instructions || "");
  const demoSavedAddresses =
    state.mode === "admin_demo" ? user?.savedDeliveryAddresses || [] : [];
  const [selectedDemoAddressIndex, setSelectedDemoAddressIndex] = useState(
    user?.defaultDeliveryAddressIndex ?? 0,
  );

  const { width } = useWindowDimensions();

  if (
    !listing ||
    (listing.status !== "published" && listing.ownerId !== user?.id)
  ) {
    return (
      <Screen back>
        <Empty
          title="Item unavailable"
          text="This listing may have been removed or paused."
        />
      </Screen>
    );
  }

  const owner = state.profiles.find((p) => p.id === listing.ownerId);
  const calendarYear = calendarMonth.getUTCFullYear();
  const calendarMonthIndex = calendarMonth.getUTCMonth();
  const calendarMonthName = calendarMonth.toLocaleString("en-GB", {
    month: "long",
    timeZone: "UTC",
  });
  const monthStart = new Date(
    Date.UTC(calendarYear, calendarMonthIndex, 1),
  ).toISOString().slice(0, 10);
  const daysInMonth = new Date(
    Date.UTC(calendarYear, calendarMonthIndex + 1, 0),
  ).getUTCDate();
  const calendar = availabilityCalendar(
    state,
    listing,
    daysInMonth,
    monthStart,
  );
  // Monday = 0, Tuesday = 1, ..., Sunday = 6
  const firstDayOffset =
    (new Date(`${monthStart}T00:00:00Z`).getUTCDay() + 6) % 7;
  const emptyPads = Array.from({ length: firstDayOffset });
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const monthNames = Array.from({ length: 12 }, (_, month) =>
    new Date(Date.UTC(2026, month, 1)).toLocaleString("en-GB", {
      month: "long",
      timeZone: "UTC",
    }),
  );
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 31 }, (_, index) => currentYear + index);

  function changeDisplayedMonth(offset: number) {
    setCalendarMonth(
      (current) =>
        new Date(
          Date.UTC(
            current.getUTCFullYear(),
            current.getUTCMonth() + offset,
            1,
          ),
        ),
    );
  }

  const selectedMethod = "Delivery Only";
  const renterRisk = user ? riskFor(state, user) : null;

  const startTimestamp = start ? toMalaysiaUtcTimestamp(start, effectivePickupTime) : "";
  const endTimestamp = end ? toMalaysiaUtcTimestamp(end, returnTime) : "";

  let quote: ReturnType<typeof quoteFor> | undefined;
  let dateError = "";
  if (start && end) {
    try {
      quote = quoteFor(
        state,
        user || {
          id: "",
          name: "",
          email: "",
          verification: "not_verified",
          favourites: [],
        },
        listing,
        startTimestamp,
        endTimestamp,
      );
      availability(state, listing, startTimestamp, endTimestamp, checkoutBooking?.id);
    } catch (e) {
      dateError = (e as Error).message;
    }
  }

  // Two-click calendar selection handler
  function handleDayPress(dayDate: string) {
    if (checkoutBooking) return;
    setError("");
    setSuccessNotice("");
    if (!start || (start && end)) {
      setStart(dayDate);
      setEnd("");
    } else {
      if (dayDate > start) {
        setEnd(dayDate);
      } else {
        setStart(dayDate);
        setEnd("");
      }
    }
  }

  // Dynamic cancellation cutoff calculation per README V3.23 Section 7.4
  let cancellationNotice = "";
  if (start && end && !dateError && (renterRisk?.score ?? 80) >= 30) {
    if (!pickupTime) {
      cancellationNotice =
        "Free cancellation until 24 hours before your chosen rental start time";
    } else {
      try {
        const pickupEpoch = parseMalaysiaTimestamp(startTimestamp);
        if (Number.isFinite(pickupEpoch)) {
          const cutoffEpoch = pickupEpoch - 24 * 60 * 60 * 1000;
          cancellationNotice = `Free cancellation until ${formatMalaysiaDateTime(cutoffEpoch)}`;
        }
      } catch {
        cancellationNotice = "";
      }
    }
  }

  // Handle Request to Rent submission for Very High Risk renters (scores 0–29)
  function handleNavigateToRequest() {
    if (!user) {
      setAuthPrompt(true);
      return;
    }
    if (!listing) return;
    try {
      const refId = `REQ-${newId().slice(0, 8).toUpperCase()}`;
      const address = getDeliveryAddress();
      act({ type: "saveDeliveryAddress", address });
      const fullDeliveryAddress = formatDeliveryAddress(address);
      act({
        type: "requestPlatformReview",
        id: refId,
        listingId: listing.id,
        start,
        end,
        pickupTime: formatTime(effectivePickupTime),
        returnTime: formatTime(returnTime),
        durationDays: quote ? quote.days : 1,
        collectionMethod: "Delivery Only",
        deliveryAddress: fullDeliveryAddress,
        location: listing.location,
        lenderName: owner?.name || "Lender",
        dailyPrice: listing.dailyPrice,
        estimatedRentalFee: quote ? quote.rentalFee : listing.dailyPrice,
        notes: "Pending CurRENT Review (Demo). Application submitted to CurRENT platform.",
      });
      router.push({
        pathname: "/rental-request",
        params: { id: refId },
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Handle Instant Booking checkout confirmation
  async function handleDeliveryDemo() {
    if (!user || payInProgress.current) return;
    if (!checkoutBooking && !deliveryAddressIsComplete()) {
      setError("Complete the required delivery address before continuing.");
      return;
    }
    if (checkoutBooking) {
      router.push(`/delivery-demo/${checkoutBooking.id}` as never);
      return;
    }
    const existing = state.bookings.find((booking) => booking.renterId === user.id &&
      booking.listingId === id && booking.start === startTimestamp && booking.end === endTimestamp &&
      booking.status === "payment_required");
    if (existing) {
      router.push(`/delivery-demo/${existing.id}` as never);
      return;
    }
    payInProgress.current = true;
    setIsPaying(true);
    try {
      const address = getDeliveryAddress();
      const bookingId = newId();
      await actAndPersist({ type: "startDeliveryCheckout", id: bookingId, listingId: id,
        start: startTimestamp, end: endTimestamp, deliveryAddress: formatDeliveryAddress(address) });
      act({ type: "saveDeliveryAddress", address });
      router.push(`/delivery-demo/${bookingId}` as never);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      payInProgress.current = false;
      setIsPaying(false);
    }
  }

  async function handleConfirmInstantBook() {
    if (payInProgress.current) return;
    if (!user) {
      setAuthPrompt(true);
      return;
    }
    if (!checkoutBooking && !deliveryAddressIsComplete()) {
      setError(
        "Complete the required Address fields before paying: recipient name, phone, street address, postcode, city, and state.",
      );
      return;
    }
    try {
      if (!checkoutBooking || checkoutBooking.deliveryDemo?.status !== "paid_demo") {
        throw new Error("Complete the separate delivery demo payment first.");
      }
      payInProgress.current = true;
      setIsPaying(true);
      setError("");
      await actAndPersist({
        type: "completeRentalCheckout",
        bookingId: checkoutBooking.id,
        paymentMethod: selectedPaymentMethod,
      });
      router.push(`/rental/${checkoutBooking.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      payInProgress.current = false;
      setIsPaying(false);
    }
  }

  function getDeliveryAddress() {
    return {
      recipientName,
      phone: deliveryPhone,
      addressLine1: streetAddress,
      addressLine2: unit,
      postcode,
      city,
      state: stateName,
      instructions: deliveryNotes,
    };
  }

  function selectDemoAddress(index: number) {
    const address = demoSavedAddresses[index];
    if (!address) return;
    setSelectedDemoAddressIndex(index);
    setRecipientName(address.recipientName);
    setDeliveryPhone(address.phone);
    setStreetAddress(address.addressLine1);
    setUnit(address.addressLine2);
    setPostcode(address.postcode);
    setCity(address.city);
    setStateName(address.state);
    setDeliveryNotes(address.instructions);
    act({ type: "saveDeliveryAddress", address });
  }

  function handleSaveDeliveryAddress() {
    if (!user) {
      setAuthPrompt(true);
      return;
    }
    try {
      act({ type: "saveDeliveryAddress", address: getDeliveryAddress() });
      setError("");
      setSuccessNotice("Address saved to your profile.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function formatDeliveryAddress(address: ReturnType<typeof getDeliveryAddress>) {
    return [
      address.recipientName.trim(),
      address.phone.trim(),
      address.addressLine1.trim(),
      address.addressLine2.trim(),
      `${address.postcode.trim()} ${address.city.trim()}`,
      address.state.trim(),
      address.instructions.trim(),
    ]
      .filter(Boolean)
      .join(", ");
  }

  function deliveryAddressIsComplete() {
    return [
      recipientName,
      deliveryPhone,
      streetAddress,
      postcode,
      city,
      stateName,
    ].every((value) => value.trim().length > 0);
  }

  return (
    <Screen back>
      <GuestAuthPrompt visible={authPrompt} onClose={() => setAuthPrompt(false)} returnTo={`/listing/${id}`} />
      <View style={[s.split, width < 800 && { flexDirection: "column" }]}>
        {/* Left Column: Image, Details, Reviews */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Image
            source={{ uri: photo || listing.imageUrl }}
            style={{
              width: "100%",
              height: width < 650 ? 270 : 380,
              borderRadius: 20,
              backgroundColor: colors.lightGrey,
            }}
          />
          {/* Section 3 & 17.5: Only Sony shows 3 thumbnails; all other listings show cover photo and ZERO thumbnails */}
          {listing.id === "sony-a7iii" && (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              {["/products/sony-thumb-1.jpg", "/products/sony-thumb-2.jpg", "/products/sony-thumb-3.jpg"].map(
                (uri, idx) => (
                  <Pressable
                    key={uri}
                    accessibilityRole="button"
                    accessibilityLabel={`View Sony gallery photo ${idx + 1}`}
                    onPress={() => setPhoto(photo === uri ? listing.imageUrl : uri)}
                  >
                    <Image
                      source={{ uri }}
                      style={[
                        styles.galleryThumb,
                        photo === uri && styles.galleryThumbActive,
                      ]}
                    />
                  </Pressable>
                ),
              )}
            </View>
          )}

          <Section title={listing.title} />
          <View style={styles.productLocationRow}>
            <Ionicons
              name="location-outline"
              size={15}
              color={colors.muted}
            />
            <Text style={styles.productLocationText}>
              {listing.location} · {listing.category} · ★{" "}
              {listing.id === "sony-a7iii"
                ? "5.0 (1 review)"
                : listing.rating
                ? listing.rating.toFixed(1)
                : "New"}
            </Text>
          </View>

          <Text style={[s.body, { marginVertical: 20 }]}>
            {listing.description}
          </Text>

          {/* Owner info card */}
          <Card>
            <Text style={s.h2}>Owner: {owner?.name || "the owner"}</Text>
            <Badge
              text={
                owner?.verification === "verified"
                  ? "Verified owner · demo"
                  : "Not verified"
              }
              green={owner?.verification === "verified"}
            />
            <Text style={s.caption}>
              {listing.id === "sony-a7iii"
                ? "1 completed rental"
                : `${
                    state.bookings.filter(
                      (b) => b.ownerId === owner?.id && b.status === "completed",
                    ).length
                  } completed rentals`}
            </Text>
            {user?.id !== listing.ownerId && <Button secondary onPress={() => user
              ? router.push({ pathname: "/(tabs)/messages", params: { listingId: listing.id } })
              : setAuthPrompt(true)}>
              <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.blue} /> Chat with Owner
            </Button>}
          </Card>

          <Button
            secondary
            onPress={() =>
              user
                ? act({ type: "favourite", listingId: id })
                : setAuthPrompt(true)
            }
          >
            {user?.favourites.includes(id)
              ? "♥ Saved to favourites"
              : "♡ Save for later"}
          </Button>

          {/* Canonical Sony A7 III Demo Review (Section 15 & 17.2) */}
          {listing.id === "sony-a7iii" && (
            <>
              <Section title="Rental Reviews" />
              <Card>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: "#F59E0B", fontSize: 16, letterSpacing: 2 }}>
                      ★★★★★
                    </Text>
                    <Text style={[s.bold, { color: colors.navy }]}>5.0</Text>
                  </View>
                  <Badge text="Sample Review" />
                </View>
                <Text style={s.bold}>Alex Tan</Text>
                <Text style={[s.body, { marginTop: 6 }]}>
                  The camera matched the listing and delivery was smooth. Everything was clear from booking to return.
                </Text>
              </Card>
            </>
          )}
        </View>

        {/* Right Column: Clean Calendar, Locked Return Time, Booking Summary */}
        <View style={{ width: width >= 800 ? 380 : "100%" }}>
          <Card>
            {/* Header: Location, Rating, Price */}
            <View style={styles.bookingCardHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.bookingLocationRow}>
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={colors.muted}
                  />
                  <Text style={styles.bookingLocation}>
                    {listing.location} · ★{" "}
                    {listing.id === "sony-a7iii"
                      ? "5.0 (1 completed rental)"
                      : listing.rating
                      ? `${listing.rating.toFixed(1)} rating`
                      : "New"}
                  </Text>
                </View>
                <Text style={s.title}>
                  {money(listing.dailyPrice)}
                  <Text style={s.caption}> / day</Text>
                </Text>
              </View>
              <Badge
                text={
                  typeof listing.estimatedValue !== "number" ||
                  !Number.isFinite(listing.estimatedValue) ||
                  listing.estimatedValue <= 0
                    ? "Valuation pending"
                    : owner?.verification === "verified"
                      ? "Verified Owner"
                      : "Not verified"
                }
                green={owner?.verification === "verified"}
              />
            </View>

            {typeof listing.estimatedValue !== "number" ||
            !Number.isFinite(listing.estimatedValue) ||
            listing.estimatedValue <= 0 ? (
              <Notice
                text="A security deposit and booking total are unavailable until CurRENT configures a protected platform valuation for this item."
              />
            ) : null}

            {/* 1. Date Range Input Boxes (Mockup Style) */}
            <View style={styles.dateBoxesRow}>
              <View
                style={[
                  styles.dateBox,
                  Boolean(start && !end) && styles.dateBoxActive,
                ]}
              >
                <Text style={styles.dateBoxLabel}>Start date</Text>
                <View style={styles.dateBoxValueRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={colors.blue}
                  />
                  <Text style={styles.dateBoxValueText}>
                    {start ? formatDate(start) : "Select date"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.dateBox,
                  Boolean(start && end) && styles.dateBoxActive,
                ]}
              >
                <Text style={styles.dateBoxLabel}>End date</Text>
                <View style={styles.dateBoxValueRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={colors.blue}
                  />
                  <Text style={styles.dateBoxValueText}>
                    {end ? formatDate(end) : "Select date"}
                  </Text>
                </View>
              </View>
            </View>

            {/* 2. Clean Monthly Calendar Grid */}
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeaderRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  disabled={
                    calendarYear === currentYear &&
                    calendarMonthIndex === new Date().getMonth()
                  }
                  onPress={() => changeDisplayedMonth(-1)}
                  style={styles.calendarNavButton}
                >
                  <Ionicons name="chevron-back" size={17} color={colors.blue} />
                </Pressable>
                <View style={styles.calendarSelectors}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Select month, ${calendarMonthName}`}
                    onPress={() => setCalendarPicker("month")}
                    style={styles.calendarSelectButton}
                  >
                    <Text style={styles.calendarSelectLabel}>Month</Text>
                    <Text style={styles.calendarSelectValue}>
                      {calendarMonthName}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.blue} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Select year, ${calendarYear}`}
                    onPress={() => setCalendarPicker("year")}
                    style={styles.calendarSelectButton}
                  >
                    <Text style={styles.calendarSelectLabel}>Year</Text>
                    <Text style={styles.calendarSelectValue}>{calendarYear}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.blue} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  disabled={calendarYear >= 2026 && calendarMonthIndex >= 11}
                  onPress={() => changeDisplayedMonth(1)}
                  style={styles.calendarNavButton}
                >
                  <Ionicons name="chevron-forward" size={17} color={colors.blue} />
                </Pressable>
                {Boolean(start || end) && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setStart("");
                      setEnd("");
                    }}
                    style={styles.clearDatesBtn}
                  >
                    <Text style={styles.clearDatesText}>Reset dates</Text>
                  </Pressable>
                )}
              </View>

              {/* Day of Week Headers */}
              <View style={styles.weekDaysRow}>
                {weekDays.map((wd) => (
                  <View key={wd} style={styles.weekDayCell}>
                    <Text style={styles.weekDayText}>{wd}</Text>
                  </View>
                ))}
              </View>

              {/* 7-Column Days Grid */}
              <View style={styles.daysGrid}>
                {emptyPads.map((_, i) => (
                  <View key={`pad-${i}`} style={styles.dayCell} />
                ))}
                {calendar.map((day) => {
                  const isStart = start === day.date;
                  const isEnd = end === day.date;
                  const isInRange = Boolean(
                    start && end && day.date >= start && day.date <= end,
                  );
                  const isSelected = isStart || isEnd;
                  const isSelectable = day.status !== "unavailable";
                  const dayNum = parseInt(day.date.split("-")[2], 10);

                  return (
                    <View key={day.date} style={styles.dayCell}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${day.date}, ${day.status}${day.status === "reserved" ? ", check selected delivery hour for partial availability" : ""}`}
                        accessibilityState={{ disabled: !isSelectable }}
                        disabled={!isSelectable}
                        onPress={() => handleDayPress(day.date)}
                        style={[
                          styles.dayBtn,
                          isInRange && styles.dayBtnInRange,
                          isSelected && styles.dayBtnSelected,
                          !isSelectable && styles.dayBtnUnavailable,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isInRange && styles.dayTextInRange,
                            isSelected && styles.dayTextSelected,
                            !isSelectable && styles.dayTextUnavailable,
                            day.status === "reserved" &&
                              !isSelected && styles.dayTextReserved,
                          ]}
                        >
                          {dayNum}
                        </Text>
                        {day.status === "reserved" && (
                          <View
                            accessibilityLabel="Existing reservation on this date"
                            style={styles.reservedDateMark}
                          />
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              <Modal
                visible={calendarPicker !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setCalendarPicker(null)}
              >
                <View style={styles.calendarModalOverlay}>
                  <View style={styles.calendarModalCard}>
                    <Text style={s.h2}>
                      Select {calendarPicker === "month" ? "month" : "year"}
                    </Text>
                    <ScrollView
                      style={{ maxHeight: 340 }}
                      contentContainerStyle={styles.calendarModalOptions}
                    >
                      {(calendarPicker === "month"
                        ? monthNames.map((name, index) => ({
                            label: name,
                            value: index,
                          }))
                        : yearOptions.map((year) => ({
                            label: String(year),
                            value: year,
                          }))
                      ).map((option) => {
                        const selected =
                          calendarPicker === "month"
                            ? option.value === calendarMonthIndex
                            : option.value === calendarYear;
                        return (
                          <Pressable
                            key={`${calendarPicker}-${option.value}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected, disabled: calendarPicker === "year" && option.value > 2026 }}
                            disabled={calendarPicker === "year" && option.value > 2026}
                            onPress={() => {
                              setCalendarMonth((current) =>
                                new Date(
                                  Date.UTC(
                                    calendarPicker === "year"
                                      ? option.value
                                      : current.getUTCFullYear(),
                                    calendarPicker === "month"
                                      ? option.value
                                      : current.getUTCMonth(),
                                    1,
                                  ),
                                ),
                              );
                              setCalendarPicker(null);
                            }}
                            style={[
                              styles.calendarModalOption,
                              selected && styles.calendarModalOptionSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.calendarModalOptionText,
                                selected &&
                                  styles.calendarModalOptionTextSelected,
                                calendarPicker === "year" && option.value > 2026 && { color: colors.muted, opacity: 0.45 },
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                    <Button
                      secondary
                      onPress={() => setCalendarPicker(null)}
                    >
                      Close
                    </Button>
                  </View>
                </View>
              </Modal>

              <Text style={styles.calendarHint}>
                {!start
                  ? "Click 1: Choose start date"
                  : !end
                  ? "Click 2: Choose return date"
                  : `Rental duration: ${start && end ? rentalDays(startTimestamp, endTimestamp) : 0} days`}
              </Text>
            </View>

            {/* 3. Delivery Arrangement & Locked Return Time Section */}
            <View style={styles.arrangementSection}>
              <View style={styles.arrangementHeaderRow}>
                <Ionicons name="time-outline" size={16} color={colors.navy} />
                <Text style={styles.arrangementTitle}>
                  Delivery & Return Arrangement
                </Text>
              </View>

              {/* Scheduled Delivery Time Slots */}
              <View style={{ marginTop: 8 }}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Scheduled Delivery Arrival Time</Text>
                  <Text style={styles.fieldSubtext}>Available delivery time slots</Text>
                </View>
                <Text style={styles.fieldSubtext}>Select the time when the item should arrive at your delivery address.</Text>
                <View style={styles.timeSlotsRow}>
                  {FIXED_DELIVERY_SLOTS.map((opt) => {
                    const isSelected = effectivePickupTime === opt.value;
                    const unavailable = !availableSlots.some((available) => available.value === opt.value) || slotUnavailable(opt.value);
                    return (
                      <Pressable
                        key={opt.value}
                        accessibilityRole="button"
                        accessibilityLabel={`Delivery at ${opt.label}`}
                        accessibilityState={{ disabled: unavailable }}
                        disabled={unavailable || Boolean(checkoutBooking)}
                        onPress={() => setPickupTime(opt.value)}
                        style={[
                          styles.timeSlotBtn,
                          isSelected && styles.timeSlotBtnSelected,
                          unavailable && { opacity: 0.4 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeSlotText,
                            isSelected && styles.timeSlotTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Return Time: Compact read-only per README V3.23 Section 7.1 */}
              <View style={styles.returnTimeCard}>
                <View style={styles.returnTimeRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Ionicons name="time-outline" size={14} color={colors.navy} />
                    <Text style={styles.returnTimeLabel}>Scheduled Return Time</Text>
                  </View>
                  <Text style={styles.returnTimeValue}>{formatHourAmPm(returnTime)}</Text>
                </View>
                <Text style={styles.fieldSubtext}>The time when you must hand the item to the courier.</Text>
              </View>

              {/* Collection: Delivery Only (fixed per V3.23 Section 7) */}
              <View style={{ marginTop: 8 }}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>Fulfilment</Text>
                </View>
                <View style={styles.deliveryOnlyPill}>
                  <Ionicons name="car-outline" size={14} color={colors.blue} />
                  <Text style={styles.deliveryOnlyText}>Delivery Only</Text>
                </View>
              </View>
            </View>

            {/* 4. Structured Delivery Address Form (Section 7.2) */}
            <View style={styles.deliveryAddressSection}>
              <View style={styles.arrangementHeaderRow}>
                <Ionicons name="location-outline" size={15} color={colors.navy} />
                <Text style={styles.arrangementTitle}>Address</Text>
              </View>

              {demoSavedAddresses.length > 0 && (
                <View style={{ gap: 8, marginTop: 10 }}>
                  <Text style={styles.inputLabel}>Saved delivery addresses</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {demoSavedAddresses.map((address, index) => (
                      <Pressable
                        key={`${address.postcode}-${address.addressLine1}`}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected: selectedDemoAddressIndex === index,
                        }}
                        onPress={() => selectDemoAddress(index)}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor:
                            selectedDemoAddressIndex === index
                              ? colors.blue
                              : colors.border,
                          backgroundColor:
                            selectedDemoAddressIndex === index
                              ? colors.paleBlue
                              : "#FFFFFF",
                        }}
                      >
                        <Text style={s.caption}>
                          {index === user?.defaultDeliveryAddressIndex
                            ? "Default · "
                            : ""}
                          {address.city}, {address.state}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={{ gap: 8, marginTop: 8 }}>
                <View style={styles.addressFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Recipient Name</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={recipientName}
                      onChangeText={setRecipientName}
                      placeholder="Full Name"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Mobile (+60)</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={deliveryPhone}
                      onChangeText={setDeliveryPhone}
                      placeholder="+60 12 345 6789"
                    />
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Street Address</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={streetAddress}
                    onChangeText={setStreetAddress}
                    placeholder="Street name & number"
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Building / Apartment / Unit (Optional)</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="Unit, floor or building"
                  />
                </View>

                <View style={styles.addressFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Postcode</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={postcode}
                      onChangeText={setPostcode}
                      placeholder="47500"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={city}
                      onChangeText={setCity}
                      placeholder="City or district"
                    />
                  </View>
                </View>

                <MalaysiaStateSelector value={stateName} onChange={setStateName} />

                <View>
                  <Text style={styles.inputLabel}>Delivery Instructions (Optional)</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={deliveryNotes}
                    onChangeText={setDeliveryNotes}
                    placeholder="Optional delivery instructions"
                  />
                </View>
              </View>
              {user && (
                <Button secondary onPress={handleSaveDeliveryAddress}>
                  Save Address
                </Button>
              )}
            </View>

            {/* Dynamic Cancellation Notice (24h before pickup) */}
            {cancellationNotice !== "" && (
              <View style={styles.cancellationNoticeBox}>
                <Ionicons name="shield-checkmark" size={16} color="#0284C7" />
                <Text style={styles.cancellationNoticeText}>
                  {cancellationNotice}
                </Text>
              </View>
            )}

            {/* For Very High Risk Renters: Clean Application Preview (not misleading checkout payment) */}
            {renterRisk?.level === "very_high" && (
              <View style={styles.reviewApplicationCard}>
                <View style={styles.reviewApplicationHeader}>
                  <Ionicons
                    name="document-text-outline"
                    size={17}
                    color={colors.navy}
                  />
                  <Text style={styles.reviewApplicationTitle}>
                    Rental Application
                  </Text>
                </View>
                <Text style={styles.reviewApplicationText}>
                  This rental is subject to standard CurRENT platform review prior
                  to booking. Review and submit your rental details on the next
                  screen.
                </Text>
                <View style={styles.reviewApplicationMeta}>
                  <Text style={styles.reviewApplicationMetaItem}>
                    Daily rate: {money(listing.dailyPrice)}/day ·{" "}
                    {quote
                      ? `${quote.days} ${quote.days === 1 ? "day" : "days"}`
                      : "Select dates"}
                  </Text>
                  <Text style={styles.reviewApplicationMetaItem}>
                    Estimated rental fee:{" "}
                    {quote ? money(quote.rentalFee) : "—"}
                  </Text>
                </View>
              </View>
            )}

            {/* Concise Booking Summary for eligible direct renters */}
            {renterRisk?.level !== "very_high" && quote && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Booking Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Rental fee · {quote.days}{" "}
                    {quote.days === 1 ? "day" : "days"}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {money(quote.rentalFee)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    CurRENT service fee (5%, min RM5)
                  </Text>
                  <Text style={styles.summaryValue}>
                    {money(quote.serviceFee)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Risk-based security deposit
                  </Text>
                  <Text style={styles.summaryValue}>
                    {money(quote.deposit)}
                  </Text>
                </View>
                <Text style={styles.depositNote}>
                  {renterRisk?.canDirectBook
                    ? `Your ${renterRisk.label} tier sets a ${
                        renterRisk.level === "low"
                          ? "5% (capped at RM500)"
                          : renterRisk.level === "medium"
                          ? "10% (capped at RM1,000)"
                          : "15% (capped at RM1,500)"
                      } refundable deposit based on replacement value. Released automatically upon verified clean return.`
                    : "Sign in and complete demo eKYC to view your risk-based deposit."}
                </Text>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRowTotal}>
                  <Text style={styles.summaryTotalLabel}>
                    Total to Pay
                  </Text>
                  <Text style={styles.summaryTotalValue}>
                    {money(quote.total)}
                  </Text>
                </View>
              </View>
            )}

            {!!(error || dateError) && (
              <Notice text={error || dateError} error />
            )}

            {!!successNotice && <Notice text={successNotice} />}

            {/* Simulated Checkout Panel */}
            {showCheckout && quote && (
              <>
                <View style={styles.checkoutPanel}>
                  <Text style={styles.checkoutTitle}>Delivery Fee — Separate Demo Payment</Text>
                  <Row label="Delivery provider" value="GrabExpress (Demo)" />
                  <Row label="Delivery origin" value={listing.location} />
                  <Row label="Delivery destination" value={checkoutBooking?.deliveryDemo?.destination || (deliveryAddressIsComplete() ? formatDeliveryAddress(getDeliveryAddress()) : "Complete your delivery address above")} />
                  <Row label="Delivery fee" value="RM10.00 (simulated quote, not an official GrabExpress rate)" />
                  <Row label="Delivery payment status" value={checkoutBooking?.deliveryDemo?.status === "paid_demo" ? "Demo Payment Completed" : "Required"} />
                  <Notice text="GrabExpress-inspired simulation only. Coverage is unverified; no real Grab payment or official partnership is claimed. The RM10.00 is excluded from CurRENT rental charges and lender commission." />
                  {checkoutBooking && <Text style={s.caption}>This checkout uses the booked dates and destination shown above. Cancel it to change them.</Text>}
                  {checkoutBooking?.deliveryDemo?.status === "paid_demo" ? (
                    <Button secondary onPress={() => router.push(`/delivery-demo/${checkoutBooking.id}` as never)}>View Demo Delivery Receipt</Button>
                  ) : (
                    <Button disabled={isPaying || (!checkoutBooking && !deliveryAddressIsComplete())} onPress={() => void handleDeliveryDemo()}>Pay Delivery Fee</Button>
                  )}
                  {checkoutBooking && <Button secondary onPress={async () => {
                    try {
                      await actAndPersist({ type: "cancelDeliveryCheckout", bookingId: checkoutBooking.id });
                      router.replace({ pathname: "/listing/[id]", params: { id } });
                    } catch (e) { setError((e as Error).message); }
                  }}>Cancel Unfinished Checkout</Button>}
                </View>
                <Notice text="Demo payment only. No real funds or banking credentials are collected." />
                <View style={styles.checkoutPanel}>
                  <Text style={styles.checkoutTitle}>CurRENT Rental Payment</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Select FPX payment method"
                    accessibilityState={{ selected: selectedPaymentMethod === "Demo FPX" }}
                    onPress={() => setSelectedPaymentMethod("Demo FPX")}
                    style={[
                      styles.fpxBadgeRow,
                      selectedPaymentMethod === "Demo FPX" && styles.fpxBadgeSelected,
                    ]}
                  >
                    <Ionicons name="card-outline" size={16} color="#0369A1" />
                    <Text style={styles.fpxBadgeText}>FPX</Text>
                    {selectedPaymentMethod === "Demo FPX" && (
                      <Ionicons name="checkmark-circle" size={17} color={colors.blue} />
                    )}
                  </Pressable>
                  <Button disabled={isPaying || checkoutBooking?.deliveryDemo?.status !== "paid_demo"} onPress={handleConfirmInstantBook}>
                    {isPaying ? "Processing demo payment…" : "Pay"}
                  </Button>
                  <Button secondary onPress={() => setShowCheckout(false)}>
                    Back
                  </Button>
                </View>
              </>
            )}

            {/* Main Action Buttons */}
            {!showCheckout && (
              <View style={{ marginTop: 14, gap: 8 }}>
                {!user ? (
                  <Button onPress={() => setAuthPrompt(true)}>
                    Sign in to Rent
                  </Button>
                ) : user.verification !== "verified" ? (
                  <Button onPress={() => router.push({ pathname: "/(tabs)/profile", params: { section: "ekyc" } })}>
                    Complete Demo eKYC in Profile to Rent
                  </Button>
                ) : renterRisk?.level === "very_high" ? (
                  <Button
                    disabled={!start || !end || !!dateError || !deliveryAddressIsComplete()}
                    onPress={handleNavigateToRequest}
                  >
                    Submit Request to CurRENT
                  </Button>
                ) : (
                  <Button
                    disabled={
                      !start ||
                      !end ||
                      !!dateError ||
                      listing.ownerId === user?.id
                    }
                    onPress={() => setShowCheckout(true)}
                  >
                    {listing.ownerId === user?.id
                      ? "This is your listing"
                      : "Rent"}
                  </Button>
                )}
                {user?.verification === "verified" &&
                  renterRisk?.level !== "very_high" &&
                  (!start ||
                    !end ||
                    !!dateError ||
                    listing.ownerId === user.id) && (
                    <Text
                      accessibilityRole="alert"
                      style={[s.caption, { marginTop: 2 }]}
                    >
                      {listing.ownerId === user.id
                        ? "You cannot rent your own listing."
                        : dateError ||
                          "Select an available start and end date to continue."}
                    </Text>
                  )}
                {user?.verification === "verified" &&
                  renterRisk?.level !== "very_high" &&
                  !deliveryAddressIsComplete() && (
                    <Text style={[s.caption, { marginTop: 2 }]}>
                      Complete the required Address fields before selecting Pay.
                    </Text>
                  )}
              </View>
            )}
          </Card>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  galleryThumb: {
    width: 65,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: colors.lightGrey,
  },
  galleryThumbActive: {
    borderColor: colors.blue,
  },
  productLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: -8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  productLocationText: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  bookingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  bookingLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  bookingLocation: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  dateBoxesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  dateBox: {
    flex: 1,
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateBoxActive: {
    borderColor: colors.blue,
    backgroundColor: colors.softBlue,
  },
  dateBoxLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 2,
  },
  dateBoxValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateBoxValueText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  calendarContainer: {
    backgroundColor: colors.paleBlue,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginTop: 10,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  calendarNavButton: {
    width: 30,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.paleBlue,
  },
  calendarSelectors: {
    flex: 1,
    minWidth: 180,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  calendarSelectButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#FFFFFF",
  },
  calendarSelectLabel: {
    color: colors.muted,
    fontSize: 10,
  },
  calendarSelectValue: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "700",
  },
  calendarModalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
  },
  calendarModalCard: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    padding: 18,
    borderRadius: 16,
    gap: 12,
    backgroundColor: "#FFFFFF",
  },
  calendarModalOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  calendarModalOption: {
    minWidth: 86,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    backgroundColor: "#FFFFFF",
  },
  calendarModalOptionSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.softBlue,
  },
  calendarModalOptionText: {
    color: colors.navy,
    textAlign: "center",
    fontSize: 13,
  },
  calendarModalOptionTextSelected: {
    color: colors.blue,
    fontWeight: "700",
  },
  clearDatesBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearDatesText: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: "600",
  },
  weekDaysRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekDayCell: {
    flex: 1,
    alignItems: "center",
  },
  weekDayText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    alignItems: "center",
    paddingVertical: 2,
  },
  dayBtn: {
    position: "relative",
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  dayBtnSelected: {
    backgroundColor: colors.blue,
  },
  dayBtnInRange: {
    backgroundColor: "#DBEAFE",
  },
  dayBtnUnavailable: {
    backgroundColor: "transparent",
    opacity: 0.35,
  },
  dayText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.navy,
  },
  dayTextSelected: {
    color: "white",
    fontWeight: "800",
  },
  dayTextInRange: {
    color: colors.blue,
    fontWeight: "700",
  },
  dayTextUnavailable: {
    color: "#94A3B8",
    textDecorationLine: "line-through",
  },
  dayTextReserved: {
    textDecorationLine: "underline",
    textDecorationColor: colors.danger,
  },
  reservedDateMark: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.danger,
  },
  calendarHint: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 6,
  },
  arrangementSection: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    gap: 8,
  },
  arrangementHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  arrangementTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.navy,
  },
  fieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.navy,
  },
  fieldSubtext: {
    fontSize: 10,
    color: colors.muted,
  },
  timeSlotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  timeSlotBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeSlotBtnSelected: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  timeSlotText: {
    fontSize: 11,
    color: colors.navy,
    fontWeight: "600",
  },
  timeSlotTextSelected: {
    color: "white",
    fontWeight: "700",
  },
  lockedReturnCard: {
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    gap: 4,
  },
  lockedReturnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lockedReturnTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0369A1",
  },
  lockedPill: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  lockedPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0284C7",
  },
  lockedReturnBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lockedReturnTimeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0C4A6E",
  },
  lockedReturnExplanation: {
    flex: 1,
    fontSize: 10,
    color: "#0369A1",
    lineHeight: 13,
  },
  cancellationNoticeBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    alignItems: "center",
  },
  cancellationNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.linkBlue,
    lineHeight: 15,
    fontWeight: "600",
  },
  summaryContainer: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.navy,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },
  depositNote: {
    fontSize: 11,
    color: colors.slate,
    lineHeight: 15,
    marginTop: 4,
    marginBottom: 6,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  summaryRowTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 2,
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.blue,
  },
  reviewApplicationCard: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    gap: 8,
  },
  reviewApplicationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewApplicationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.navy,
  },
  reviewApplicationText: {
    fontSize: 12,
    color: colors.slate,
    lineHeight: 16,
  },
  reviewApplicationMeta: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  reviewApplicationMetaItem: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: "600",
  },
  checkoutPanel: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    gap: 10,
  },
  checkoutTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.navy,
  },
  fpxBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fpxBadgeSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.softBlue,
  },
  fpxBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.linkBlue,
    letterSpacing: 1,
  },
  deliveryOnlyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  deliveryOnlyText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },
  returnTimeCard: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  returnTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  returnTimeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
  },
  returnTimeValue: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.blue,
  },
  deliveryAddressSection: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 4,
  },
  deliveryAddressSubtext: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
  addressFieldRow: {
    flexDirection: "row",
    gap: 8,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.navy,
    marginBottom: 2,
  },
  addressInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.navy,
  },
});
