import { useState } from "react";
import {
  Image,
  Pressable,
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
  dateAfter,
  formatMalaysiaDateTime,
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

const TIME_OPTIONS = [
  { value: "09:00", label: "09:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "18:00", label: "06:00 PM" },
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, user, act } = useMarketplace();
  const listing = state.listings.find((l) => l.id === id);

  const [start, setStart] = useState(dateAfter(1));
  const [end, setEnd] = useState(dateAfter(3));
  const [pickupTime, setPickupTime] = useState("11:00");
  // Return time is strictly auto-matched and locked to pickup time per 24-hour rental rules
  const returnTime = pickupTime;
  const [collectionMethod, setCollectionMethod] =
    useState<CollectionMethod>("Delivery");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Demo FPX");
  const [showCheckout, setShowCheckout] = useState(false);
  const [error, setError] = useState("");
  const [successNotice, setSuccessNotice] = useState("");
  const [photo, setPhoto] = useState("");

  // Delivery Address state per README V3.23 Section 7.2
  const [recipientName, setRecipientName] = useState(user?.name || "");
  const [deliveryPhone, setDeliveryPhone] = useState("+60 12 345 6789");
  const [streetAddress, setStreetAddress] = useState("Jalan SS 15/4");
  const [unit, setUnit] = useState("");
  const [postcode, setPostcode] = useState("47500");
  const [city, setCity] = useState("Subang Jaya");
  const [stateName, setStateName] = useState("Selangor");
  const [deliveryNotes, setDeliveryNotes] = useState("");

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
  const calendar = availabilityCalendar(state, listing, 28);
  const firstDate = calendar[0]?.date
    ? new Date(calendar[0].date + "T00:00:00Z")
    : new Date();
  const monthHeader = firstDate.toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  // Monday = 0, Tuesday = 1, ..., Sunday = 6
  const firstDayOffset = (firstDate.getUTCDay() + 6) % 7;
  const emptyPads = Array.from({ length: firstDayOffset });
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const selectedMethod = "Delivery Only";
  const renterRisk = user ? riskFor(state, user) : null;

  const startTimestamp = start ? toMalaysiaUtcTimestamp(start, pickupTime) : "";
  const endTimestamp = end ? toMalaysiaUtcTimestamp(end, returnTime) : "";

  // Check for immediately contiguous consecutive extension (Section 10)
  const existingActiveBooking = user
    ? state.bookings.find(
        (b) =>
          b.renterId === user.id &&
          b.listingId === listing.id &&
          ["confirmed", "upcoming", "active"].includes(b.status),
      )
    : undefined;

  const isConsecutiveExtension = Boolean(
    existingActiveBooking &&
      startTimestamp &&
      (startTimestamp === existingActiveBooking.scheduledReturn ||
        startTimestamp === existingActiveBooking.end ||
        (existingActiveBooking.end && start === existingActiveBooking.end.slice(0, 10))),
  );

  const extensionDays =
    isConsecutiveExtension && start && end
      ? rentalDays(startTimestamp, endTimestamp)
      : 0;
  const extRentalFee = listing.dailyPrice * extensionDays;
  const extServiceFee = Math.max(5, Math.round(extRentalFee * 0.05));
  const extTotal = extRentalFee + extServiceFee;

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
      availability(
        state,
        listing,
        startTimestamp,
        endTimestamp,
        isConsecutiveExtension ? existingActiveBooking?.id : undefined,
      );
    } catch (e) {
      dateError = (e as Error).message;
    }
  }

  // Two-click calendar selection handler
  function handleDayPress(dayDate: string) {
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
  if (start && end && !dateError && (renterRisk?.score ?? 78) >= 30) {
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
      router.push("/auth");
      return;
    }
    if (!listing) return;
    try {
      const refId = `REQ-${newId().slice(0, 8).toUpperCase()}`;
      const fullDeliveryAddress = `${recipientName.trim()}${deliveryPhone.trim() ? `, ${deliveryPhone.trim()}` : ""}, ${streetAddress.trim()}${unit.trim() ? `, ${unit.trim()}` : ""}, ${postcode.trim()} ${city.trim()}, ${stateName.trim()}${deliveryNotes.trim() ? ` (Notes: ${deliveryNotes.trim()})` : ""}`;
      act({
        type: "requestPlatformReview",
        id: refId,
        listingId: listing.id,
        start,
        end,
        pickupTime: formatTime(pickupTime),
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
  function handleConfirmInstantBook() {
    if (!user) {
      router.push("/auth");
      return;
    }
    try {
      if (isConsecutiveExtension && existingActiveBooking) {
        act({
          type: "consecutiveExtend",
          bookingId: existingActiveBooking.id,
          additionalDays: extensionDays,
        });
        router.push(`/rental/${existingActiveBooking.id}`);
        return;
      }
      const bookingId = newId();
      act({
        type: "instantBook",
        id: bookingId,
        listingId: id,
        start: startTimestamp,
        end: endTimestamp,
        collectionMethod: selectedMethod,
        paymentMethod: selectedPaymentMethod,
      });
      router.push(`/rental/${bookingId}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen back>
      <View style={[s.split, width < 800 && { flexDirection: "column" }]}>
        {/* Left Column: Image, Details, Reviews */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Image
            source={{ uri: photo || listing.imageUrl }}
            style={{
              width: "100%",
              height: width < 650 ? 270 : 380,
              borderRadius: 20,
              backgroundColor: "#F1F5F9",
            }}
          />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            {(listing.images || [listing.imageUrl]).map((uri) => (
              <Pressable
                key={uri}
                accessibilityRole="button"
                accessibilityLabel="View item photo"
                onPress={() => setPhoto(uri)}
              >
                <Image
                  source={{ uri }}
                  style={[
                    styles.galleryThumb,
                    (photo === uri || (!photo && uri === listing.imageUrl)) &&
                      styles.galleryThumbActive,
                  ]}
                />
              </Pressable>
            ))}
          </View>

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
          </Card>

          <Button
            secondary
            onPress={() =>
              user
                ? act({ type: "favourite", listingId: id })
                : router.push("/auth")
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
                  owner?.verification === "verified"
                    ? "Verified Owner"
                    : "Instant Booking"
                }
                green
              />
            </View>

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
                <Text style={styles.calendarMonthTitle}>{monthHeader}</Text>
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
                    start && end && day.date > start && day.date < end,
                  );
                  const isSelected = isStart || isEnd;
                  const isAvailable = day.status === "available";
                  const dayNum = parseInt(day.date.split("-")[2], 10);

                  return (
                    <View key={day.date} style={styles.dayCell}>
                      <Pressable
                        key={day.date}
                        accessibilityRole="button"
                        accessibilityLabel={`${day.date}, ${day.status}`}
                        accessibilityState={{ disabled: !isAvailable }}
                        disabled={!isAvailable}
                        onPress={() => handleDayPress(day.date)}
                        style={[
                          styles.dayBtn,
                          isInRange && styles.dayBtnInRange,
                          isSelected && styles.dayBtnSelected,
                          !isAvailable && styles.dayBtnUnavailable,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            isInRange && styles.dayTextInRange,
                            isSelected && styles.dayTextSelected,
                            !isAvailable && styles.dayTextUnavailable,
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

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
                  <Text style={styles.fieldLabel}>Scheduled Delivery Time</Text>
                  <Text style={styles.fieldSubtext}>Available delivery time slots</Text>
                </View>
                <View style={styles.timeSlotsRow}>
                  {TIME_OPTIONS.map((opt) => {
                    const isSelected = pickupTime === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        accessibilityRole="button"
                        accessibilityLabel={`Delivery at ${opt.label}`}
                        onPress={() => setPickupTime(opt.value)}
                        style={[
                          styles.timeSlotBtn,
                          isSelected && styles.timeSlotBtnSelected,
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
                    <Text style={styles.returnTimeLabel}>Return Time</Text>
                  </View>
                  <Text style={styles.returnTimeValue}>{formatHourAmPm(returnTime)}</Text>
                </View>
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
                <Text style={styles.arrangementTitle}>Delivery Address</Text>
              </View>
              <Text style={styles.deliveryAddressSubtext}>
                Private destination address in Klang Valley.
              </Text>

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
                      placeholder="Subang Jaya"
                    />
                  </View>
                </View>
              </View>
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
            {renterRisk?.level !== "very_high" && (quote || isConsecutiveExtension) && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>
                  {isConsecutiveExtension ? "Extension Summary" : "Booking Summary"}
                </Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {isConsecutiveExtension ? "Additional rental fee" : "Rental fee"} ·{" "}
                    {isConsecutiveExtension ? extensionDays : quote?.days}{" "}
                    {(isConsecutiveExtension ? extensionDays : quote?.days) === 1 ? "day" : "days"}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {money(isConsecutiveExtension ? extRentalFee : quote?.rentalFee ?? 0)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    CurRENT service fee (5%, min RM5)
                  </Text>
                  <Text style={styles.summaryValue}>
                    {money(isConsecutiveExtension ? extServiceFee : quote?.serviceFee ?? 0)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    {isConsecutiveExtension ? "Security Deposit" : "Risk-based security deposit"}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {isConsecutiveExtension ? "—" : money(quote?.deposit ?? 0)}
                  </Text>
                </View>
                <Text style={styles.depositNote}>
                  {isConsecutiveExtension
                    ? "Original deposit remains held; no additional deposit required."
                    : renterRisk?.canDirectBook
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
                    {isConsecutiveExtension ? "Total to Pay" : "Total payable today"}
                  </Text>
                  <Text style={styles.summaryTotalValue}>
                    {money(isConsecutiveExtension ? extTotal : quote?.total ?? 0)}
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
              <View style={styles.checkoutPanel}>
                <Text style={styles.checkoutTitle}>Secure Checkout</Text>
                <Text style={styles.checkoutSubtitle}>
                  Payment via FPX (simulated — no real bank details collected).
                </Text>
                <View style={styles.fpxBadgeRow}>
                  <Ionicons name="card-outline" size={16} color="#0369A1" />
                  <Text style={styles.fpxBadgeText}>FPX</Text>
                </View>
                <Button onPress={handleConfirmInstantBook}>
                  Pay
                </Button>
                <Button secondary onPress={() => setShowCheckout(false)}>
                  Back
                </Button>
              </View>
            )}

            {/* Main Action Buttons */}
            {!showCheckout && (
              <View style={{ marginTop: 14, gap: 8 }}>
                {!user ? (
                  <Button onPress={() => router.push("/auth")}>
                    Sign in to Rent
                  </Button>
                ) : user.verification !== "verified" ? (
                  <Button onPress={() => router.push("/(tabs)/profile")}>
                    Complete Demo eKYC in Profile to Rent
                  </Button>
                ) : renterRisk?.level === "very_high" ? (
                  <Button
                    disabled={!start || !end || !!dateError || !recipientName.trim() || !streetAddress.trim()}
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
                      listing.ownerId === user?.id ||
                      !recipientName.trim() ||
                      !streetAddress.trim()
                    }
                    onPress={() => setShowCheckout(true)}
                  >
                    {listing.ownerId === user?.id
                      ? "This is your listing"
                      : "Rent"}
                  </Button>
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
    backgroundColor: "#F1F5F9",
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
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateBoxActive: {
    borderColor: colors.blue,
    backgroundColor: "#EFF6FF",
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
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginTop: 10,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  calendarMonthTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
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
  calendarHint: {
    fontSize: 11,
    color: colors.muted,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 6,
  },
  arrangementSection: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    borderBottomColor: "#E2E8F0",
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
    borderColor: "#CBD5E1",
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
  checkoutSubtitle: {
    fontSize: 12,
    color: colors.slate,
    lineHeight: 16,
  },
  fpxBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.navy,
  },
});
