import { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Platform,
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
  calculateProtectionFee,
  calculateProtectionLimit,
  requiresProtectionEligibilityReview,
  RENTAL_PROTECTION_LIMIT_CAP,
  demoSlotAvailable,
  isDemoSeededListing,
  dateAfter,
  formatMalaysiaDateTime,
  getBookingTotals,
  malaysiaDateKey,
  malaysiaTimeKey,
  money,
  parseMalaysiaTimestamp,
  quoteFor,
  rentalDays,
  riskFor,
  SINGLE_CHECKOUT,
  toMalaysiaUtcTimestamp,
} from "../../services/booking";
import { colors, radius } from "../../constants/theme";
import type { CollectionMethod } from "../../types";
import { newId } from "../../services/marketplace";
import { GuestAuthPrompt } from "../../components/GuestAuth";
import { SuccessBurst } from "../../components/SuccessBurst";
import { MalaysiaStateSelector } from "../../components/MalaysiaStateSelector";
import { resolvePostcodeCoordinate } from "../../services/geo";
import { addDaysToDateString, deliveryRateDescription, DOMESTIC_COURIER_NAME, estimatedCourierTransitDays, hasReliableCourierTransitEstimate, isDispatchDateFeasible, quoteAutomaticDomesticCourier, quoteAutomaticVehicleDelivery, recommendDispatchDate } from "../../services/delivery";

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
  // The billed rental duration/fees still use the pickup time for both ends of the 24-hour
  // cycle, exactly as before — selecting a return pickup time below never changes this.
  const returnTime = effectivePickupTime;
  // Renter-selected courier collection time, independent of the delivery arrival time above.
  // Purely a scheduling/display field (see services/booking.ts formatScheduledReturnPickup) —
  // it never feeds into rental duration or fee calculations.
  const [returnPickupTime, setReturnPickupTime] = useState(checkoutBooking?.returnPickupTime || "");
  const returnSlotUnavailable = (slot: string) => {
    if (state.mode === "admin_demo" && listing && isDemoSeededListing(listing.id) && end &&
      !demoSlotAvailable(listing.id, end, slot)) return true;
    // Same-day rental: the courier can't collect before the item has even arrived.
    if (start && end && start === end && slot <= effectivePickupTime) return true;
    return false;
  };
  const effectiveReturnPickupTime =
    returnPickupTime && availableSlots.some((s) => s.value === returnPickupTime) && !returnSlotUnavailable(returnPickupTime)
      ? returnPickupTime
      : "";
  // Domestic Courier (Demo) scheduling — used instead of the hourly slots above when the
  // resolved delivery method is the cross-state courier, not GrabExpress. The renter never
  // types these dates: CurRENT recommends the outbound dispatch date and the return dispatch
  // date defaults to the rental end date; the renter can only request a different return date.
  // Return is a courier branch drop-off, not a scheduled pickup — the renter never arranges
  // courier collection. The lender confirms the outbound arrangement separately via
  // "Confirm Outbound Dispatch Arrangement" on their Rental Details screen.
  const [returnDispatchDateOverride, setReturnDispatchDateOverride] = useState(
    checkoutBooking?.returnDispatchDate && checkoutBooking.returnDispatchDate !== checkoutBooking.end.slice(0, 10)
      ? checkoutBooking.returnDispatchDate
      : "",
  );
  const [showReturnDateOverride, setShowReturnDateOverride] = useState(!!returnDispatchDateOverride);
  const [collectionMethod, setCollectionMethod] =
    useState<CollectionMethod>("Delivery");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("Demo FPX");
  // Once GrabExpress delivery is paid, automatically land the renter on the CurRENT Rental
  // Payment step (the two-step order is: delivery first, then rental payment).
  const [showCheckout, setShowCheckout] = useState(
    () => checkoutBooking?.deliveryDemo?.status === "paid_demo",
  );
  const [showDeliveryDetails, setShowDeliveryDetails] = useState(false);
  const [insuranceSelected, setInsuranceSelected] = useState(false);
  const [showInsuranceDetails, setShowInsuranceDetails] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const payInProgress = useRef(false);
  const [error, setError] = useState("");
  const [authPrompt, setAuthPrompt] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");
  const [addressSectionY, setAddressSectionY] = useState<number | null>(null);
  const [scrollToAddressRequestId, setScrollToAddressRequestId] = useState(0);
  const [photo, setPhoto] = useState("");

  // Delivery Address state per README V3.23 Section 7.2
  const [recipientName, setRecipientName] = useState(user?.savedDeliveryAddress?.recipientName || user?.name || "");
  const [deliveryPhone, setDeliveryPhone] = useState(user?.savedDeliveryAddress?.phone || user?.phone || "");
  const [streetAddress, setStreetAddress] = useState(user?.savedDeliveryAddress?.addressLine1 || "");
  const [unit, setUnit] = useState(user?.savedDeliveryAddress?.addressLine2 || "");
  // When resuming an existing checkout, the postcode must start as whatever the paid delivery
  // fee was actually calculated against — not whatever happens to be in the account's general
  // saved address — otherwise this field silently disagrees with the paid booking and the
  // "delivery details changed" guard permanently blocks the rental Pay button.
  const [postcode, setPostcode] = useState(checkoutBooking?.deliveryPostcode || user?.savedDeliveryAddress?.postcode || "");
  const [city, setCity] = useState(user?.savedDeliveryAddress?.city || "");
  const [stateName, setStateName] = useState(user?.savedDeliveryAddress?.state || "");
  const [deliveryNotes, setDeliveryNotes] = useState(user?.savedDeliveryAddress?.instructions || "");
  const demoSavedAddresses =
    state.mode === "admin_demo" ? user?.savedDeliveryAddresses || [] : [];
  const [selectedDemoAddressIndex, setSelectedDemoAddressIndex] = useState(
    user?.defaultDeliveryAddressIndex ?? 0,
  );

  // The user's saved address can still be loading (async session restore), or this
  // screen instance can be reused by the navigator across listings/logins without
  // remounting, so the useState initializers above can lock in stale or empty values.
  // Re-sync from the account's saved address whenever it actually changes, but stop
  // once the renter has started editing the form themselves.
  const addressEditedRef = useRef(false);
  const lastSyncedAddressKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    // Resuming an already-paid delivery checkout: the form must keep showing the address that
    // was actually charged, never silently drift back to the account's general saved address.
    if (!user?.id || addressEditedRef.current || checkoutBooking) return;
    const saved = user.savedDeliveryAddress;
    const savedKey = saved ? JSON.stringify(saved) : "";
    if (lastSyncedAddressKey.current === savedKey) return;
    lastSyncedAddressKey.current = savedKey;
    setRecipientName(saved?.recipientName || user.name || "");
    setDeliveryPhone(saved?.phone || user.phone || "");
    setStreetAddress(saved?.addressLine1 || "");
    setUnit(saved?.addressLine2 || "");
    setPostcode(saved?.postcode || "");
    setCity(saved?.city || "");
    setStateName(saved?.state || "");
    setDeliveryNotes(saved?.instructions || "");
    setSelectedDemoAddressIndex(user.defaultDeliveryAddressIndex ?? 0);
  }, [user?.id, user?.savedDeliveryAddress, user?.name, user?.phone, user?.defaultDeliveryAddressIndex]);

  function markAddressEdited<T>(setter: (value: T) => void) {
    return (value: T) => {
      addressEditedRef.current = true;
      setter(value);
    };
  }
  const onRecipientNameChange = markAddressEdited(setRecipientName);
  const onDeliveryPhoneChange = markAddressEdited(setDeliveryPhone);
  const onStreetAddressChange = markAddressEdited(setStreetAddress);
  const onUnitChange = markAddressEdited(setUnit);
  function onPostcodeChange(value: string) {
    addressEditedRef.current = true;
    setPostcode(value);
    // Auto-populate city/state from the postcode reference dataset — the renter should never
    // have to type the full address just to see a delivery estimate (Stage 1: postcode only).
    const resolved = resolvePostcodeCoordinate(value);
    if (resolved) {
      setCity(resolved.area);
      setStateName(resolved.state);
    }
  }
  const onCityChange = markAddressEdited(setCity);
  const onStateNameChange = markAddressEdited(setStateName);
  const onDeliveryNotesChange = markAddressEdited(setDeliveryNotes);

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
  const currentDeliveryAddress = formatDeliveryAddress(getDeliveryAddress());
  // Vehicle and fee come from the lender's parcel details and pickup postcode,
  // plus the renter's delivery postcode (no maps API or renter distance input).
  const parcel = { weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm, requirement: listing.deliveryRequirement,
    title: listing.title, category: listing.category, description: listing.description };
  const deliveryEstimate = deliveryLocalityIsComplete() ? quoteAutomaticVehicleDelivery({ pickupPostcode: listing.pickupPostcode, deliveryPostcode: postcode, ...parcel }) : null;
  // Return leg (delivery address → pickup), calculated separately with the same automatic
  // postcode-distance formula — never assumed to cost the same as the outbound leg.
  const returnDeliveryEstimate = deliveryLocalityIsComplete() ? quoteAutomaticVehicleDelivery({ pickupPostcode: postcode, deliveryPostcode: listing.pickupPostcode, ...parcel }) : null;
  // GrabExpress only covers same-state routes. When it doesn't resolve, try the Domestic
  // Courier (cross-state) quote instead, before showing "estimate unavailable".
  const courierParcel = { pickupPostcode: listing.pickupPostcode, deliveryPostcode: postcode,
    weightKg: listing.parcelWeightKg, dimensionsCm: listing.parcelDimensionsCm, packages: listing.parcelPackages };
  const courierEstimate = deliveryLocalityIsComplete() && !deliveryEstimate ? quoteAutomaticDomesticCourier(courierParcel) : null;
  const returnCourierEstimate = deliveryLocalityIsComplete() && !returnDeliveryEstimate
    ? quoteAutomaticDomesticCourier({ ...courierParcel, pickupPostcode: postcode, deliveryPostcode: listing.pickupPostcode })
    : null;
  const isCourierDelivery = !deliveryEstimate && !!courierEstimate;
  const twoWayDeliveryFee = deliveryEstimate && returnDeliveryEstimate
    ? Math.round((deliveryEstimate.fee + returnDeliveryEstimate.fee) * 100) / 100
    : courierEstimate && returnCourierEstimate
    ? Math.round((courierEstimate.fee + returnCourierEstimate.fee) * 100) / 100
    : null;
  // J&T Express's own published Peninsular Malaysia estimate; East Malaysia has no equivalent
  // published reference this demo can cite, so hasEstimate is false there (see
  // hasReliableCourierTransitEstimate) and the UI shows "To Be Confirmed" instead.
  const hasCourierEstimate = courierEstimate ? hasReliableCourierTransitEstimate(courierEstimate.zone) : false;
  const courierTransit = hasCourierEstimate ? estimatedCourierTransitDays(courierEstimate!.zone) : null;
  // CurRENT recommends this automatically — the renter never schedules the lender's courier
  // pickup directly. The lender can accept it or propose an alternate date (Confirm Outbound
  // Dispatch Arrangement, on their Rental Details screen) after the booking is paid. null when
  // the zone has no reliable transit reference.
  const recommendedDispatchDate = courierEstimate && start ? recommendDispatchDate(start, courierEstimate.zone) : null;
  const dispatchDate = checkoutBooking?.deliveryDemo?.dispatchDate || recommendedDispatchDate || "";
  const dispatchDateFeasible = !dispatchDate || isDispatchDateFeasible(dispatchDate, new Date().toISOString().slice(0, 10));
  const returnDispatchDate = returnDispatchDateOverride || end || "";
  const estimatedDeliveryRange = courierTransit && dispatchDate
    ? { start: addDaysToDateString(dispatchDate, courierTransit.min), end: addDaysToDateString(dispatchDate, courierTransit.max) }
    : null;
  const estimatedReturnRange = courierTransit && returnDispatchDate
    ? { start: addDaysToDateString(returnDispatchDate, courierTransit.min), end: addDaysToDateString(returnDispatchDate, courierTransit.max) }
    : null;
  const deliveryIssue = !postcode.trim()
    ? { message: "Enter your postcode to estimate delivery.", action: "" }
    : !/^\d{5}$/.test(postcode.trim())
    ? { message: "Please enter a valid 5-digit Malaysian postcode.", action: "" }
    : !listing.pickupPostcode
    ? { message: "Lender pickup postcode required.", action: "" }
    : !resolvePostcodeCoordinate(postcode)
    ? { message: "Postcode not recognised. Please verify your postcode or select your locality.", action: "" }
    : { message: "Special Delivery Quotation Required for this route or parcel — it exceeds the local vehicle and standard courier parcel limits.", action: "View Delivery Details" };
  // Lock the time-slot pickers only once the delivery fee has actually been paid for this
  // checkout — an in-progress, unpaid checkout record must not block the renter from still
  // adjusting their pickup/return time before paying.
  const deliveryTimeSlotsLocked = checkoutBooking?.deliveryDemo?.status === "paid_demo";
  // Only re-require a delivery payment when the renter's delivery POSTCODE actually changed
  // from the one the paid delivery checkout was calculated and charged against — compared
  // directly against the booking's own stored postcode, not a freshly recomputed distance
  // (which could drift from a paid value due to rounding or a stale live recalculation).
  // Editing contact fields like recipient name, phone, unit or instructions, or a listing's
  // pickup location (fixed once published), must never invalidate a paid checkout.
  const deliveryDetailsChanged = !!checkoutBooking?.deliveryDemo &&
    checkoutBooking.deliveryDemo.status === "paid_demo" &&
    !!checkoutBooking.deliveryPostcode && !!postcode.trim() &&
    checkoutBooking.deliveryPostcode.trim() !== postcode.trim();
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
        insuranceSelected,
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
    const hasGrab = !!deliveryEstimate && !!returnDeliveryEstimate;
    const hasCourier = !!courierEstimate && !!returnCourierEstimate;
    if (!hasGrab && !hasCourier) { setError("Delivery Estimate Unavailable. Enter a complete delivery address with a valid Malaysian postcode."); return; }
    if (!checkoutBooking && !deliveryAddressIsComplete()) {
      setError("Complete the required delivery address before continuing.");
      return;
    }
    if (!checkoutBooking && !isCourierDelivery && !effectiveReturnPickupTime) {
      setError("Select a scheduled return pickup time before continuing.");
      return;
    }
    if (!checkoutBooking && isCourierDelivery && dispatchDate && !dispatchDateFeasible) {
      setError("Selected Rental Dates Unavailable for Courier Delivery — your selected rental start date does not allow sufficient estimated shipping time. Please choose a later rental date.");
      return;
    }
    if (checkoutBooking) {
      if (deliveryDetailsChanged) { setError("Delivery details changed. Cancel this checkout and calculate a new demo delivery payment."); return; }
      router.push(`/delivery-demo/${checkoutBooking.id}` as never);
      return;
    }
    const existing = state.bookings.find((booking) => booking.renterId === user.id &&
      booking.listingId === id && booking.start === startTimestamp && booking.end === endTimestamp &&
      booking.status === "payment_required");
    if (existing) {
      const unchanged = isCourierDelivery
        ? existing.deliveryDemo?.destination === currentDeliveryAddress
        : existing.deliveryDemo?.destination === currentDeliveryAddress && existing.deliveryDemo?.distanceKm === deliveryEstimate?.distanceKm;
      if (!unchanged) {
        setError("An unfinished checkout already exists for these dates. Reopen or cancel it before calculating a new delivery quote.");
        return;
      }
      router.push(`/delivery-demo/${existing.id}` as never);
      return;
    }
    payInProgress.current = true;
    setIsPaying(true);
    try {
      const address = getDeliveryAddress();
      const bookingId = newId();
      await actAndPersist({ type: "startDeliveryCheckout", id: bookingId, listingId: id,
        start: startTimestamp, end: endTimestamp, deliveryAddress: formatDeliveryAddress(address),
        deliveryPostcode: postcode,
        ...(isCourierDelivery ? {} : { returnPickupTime: effectiveReturnPickupTime }) });
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
      if (!checkoutBooking || checkoutBooking.deliveryDemo?.status !== "paid_demo" || deliveryDetailsChanged) {
        throw new Error("Complete the separate delivery demo payment first.");
      }
      payInProgress.current = true;
      setIsPaying(true);
      setError("");
      await actAndPersist({
        type: "completeRentalCheckout",
        bookingId: checkoutBooking.id,
        paymentMethod: selectedPaymentMethod,
        insuranceSelected,
      });
      setPaySuccess(true);
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
    addressEditedRef.current = true;
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

  // Stage 1 (fee estimation) needs only the postcode — the estimator itself resolves city/state/
  // coordinates from it. Full street address, unit, recipient name and phone are Stage 2
  // (booking confirmation) requirements and must never block showing a fee estimate.
  function deliveryLocalityIsComplete() {
    return postcode.trim().length > 0;
  }

  return (
    <Screen back scrollToY={addressSectionY} scrollRequestId={scrollToAddressRequestId}>
      <GuestAuthPrompt visible={authPrompt} onClose={() => setAuthPrompt(false)} returnTo={`/listing/${id}`} />
      <View style={[s.split, width < 1024 && { flexDirection: "column" }]}>
        {/* Left Column: Image, Details, Reviews */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Image
            source={{ uri: photo || listing.imageUrl }}
            style={{
              width: "100%",
              height: width < 650 ? 270 : 380,
              borderRadius: radius.lg,
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

        {/* Right Column: Clean Calendar, Locked Return Time, Booking Summary. Sticky on web
            desktop so the booking panel stays in view while the left column (photos/description)
            scrolls underneath it. Capped to the viewport height and scrollable on its own when taller. */}
        <View
          style={[
            { width: width >= 1024 ? 380 : "100%" },
            width >= 1024 && Platform.OS === "web" ? ({ position: "sticky", top: 20, alignSelf: "flex-start", maxHeight: "calc(100vh - 40px)", overflowY: "auto" } as any) : null,
          ]}
        >
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

              {isCourierDelivery ? (
                !dispatchDateFeasible ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.slotSectionTitle}>Selected Rental Dates Unavailable for Courier Delivery</Text>
                    <Text style={styles.slotSectionDescription}>
                      Your selected rental start date does not allow sufficient estimated shipping time. Please choose a later rental date.
                    </Text>
                  </View>
                ) : (
                  <>
                    {/* Outbound Shipping — CurRENT recommends the dispatch date automatically; the
                        renter never schedules the lender's courier pickup directly. The lender
                        confirms (or proposes an alternate) via Confirm Outbound Dispatch
                        Arrangement on their Rental Details screen once the booking is paid. */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.slotSectionTitle}>Planned Dispatch Date</Text>
                      <Text style={styles.slotSectionDescription}>
                        Automatically recommended by CurRENT.
                      </Text>
                      {dispatchDate ? (
                        <Text style={styles.returnTimeValue}>{dispatchDate}</Text>
                      ) : (
                        <Text style={styles.returnTimeValue}>Delivery Timing Confirmation Required</Text>
                      )}
                      <Text style={styles.fieldSubtext}>
                        Dispatch Status: {checkoutBooking?.deliveryDemo?.outboundDispatchStatus === "confirmed"
                          ? "Confirmed by Lender"
                          : checkoutBooking?.deliveryDemo?.outboundDispatchStatus === "drop_off"
                          ? "Drop-off Arrangement"
                          : checkoutBooking?.deliveryDemo?.outboundDispatchStatus === "proposed_alternate"
                          ? "Lender Proposed a New Date"
                          : "Awaiting Lender Confirmation"}
                      </Text>
                      <Text style={styles.fieldSubtext}>
                        Estimated Arrival: {estimatedDeliveryRange ? `${estimatedDeliveryRange.start} – ${estimatedDeliveryRange.end}` : "To Be Confirmed"}
                      </Text>
                    </View>

                    {/* Return Shipping — CurRENT suggests the return drop-off date from the agreed
                        rental end date; the renter can request a different date, but this is a
                        courier branch drop-off, not a scheduled pickup — the renter never
                        arranges courier collection. */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={styles.slotSectionTitle}>Return Drop-off Date</Text>
                      <Text style={styles.slotSectionDescription}>
                        Automatically suggested using your rental end date.
                      </Text>
                      <Text style={styles.returnTimeValue}>{returnDispatchDate}</Text>
                      {!deliveryTimeSlotsLocked && (
                        <Pressable accessibilityRole="button" onPress={() => setShowReturnDateOverride((open) => !open)}>
                          <Text style={styles.summaryLinkText}>
                            {showReturnDateOverride ? "Use the suggested date instead" : "Request a different return date"}
                          </Text>
                        </Pressable>
                      )}
                      {showReturnDateOverride && (
                        <TextInput
                          accessibilityLabel="Requested return drop-off date"
                          placeholder="YYYY-MM-DD"
                          value={returnDispatchDateOverride}
                          onChangeText={setReturnDispatchDateOverride}
                          editable={!deliveryTimeSlotsLocked}
                          style={styles.addressInput}
                        />
                      )}
                      <Text style={styles.fieldSubtext}>Return Method: Courier Branch Drop-off</Text>
                      <Text style={styles.fieldSubtext}>
                        Please securely package the item and drop it off at an eligible courier branch by the agreed return deadline.
                      </Text>
                      <Text style={styles.fieldSubtext}>
                        Estimated Return Arrival: {estimatedReturnRange ? `${estimatedReturnRange.start} – ${estimatedReturnRange.end}` : "To Be Confirmed"}
                      </Text>
                      <Text style={styles.fieldSubtext}>
                        Demo scheduling based on published courier transit estimates. Dates are provisional and are not confirmed J&T Express bookings or tracking information.
                      </Text>
                    </View>
                  </>
                )
              ) : (
                <>
                  {/* Scheduled Delivery Time Slots */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.slotSectionTitle}>Scheduled Delivery Arrival Time</Text>
                    <Text style={styles.slotSectionDescription}>
                      Select the time when the item should arrive at your delivery address.
                    </Text>
                    <Text style={styles.slotListLabel}>Available delivery time slots</Text>
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
                            disabled={unavailable || deliveryTimeSlotsLocked}
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

                  {/* Scheduled Return Pickup Time — selected independently of the delivery arrival
                      time above; never changes the rental's billed duration or dates. */}
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.slotSectionTitle}>Scheduled Return Pickup Time</Text>
                    <Text style={styles.slotSectionDescription}>
                      Select when the courier should collect the item from your address and return it to the owner.
                    </Text>
                    <Text style={styles.slotListLabel}>Available return pickup time slots</Text>
                    <View style={styles.timeSlotsRow}>
                      {FIXED_DELIVERY_SLOTS.map((opt) => {
                        const isSelected = returnPickupTime === opt.value;
                        const unavailable = !availableSlots.some((available) => available.value === opt.value) || returnSlotUnavailable(opt.value);
                        return (
                          <Pressable
                            key={opt.value}
                            accessibilityRole="button"
                            accessibilityLabel={`Return pickup at ${opt.label}`}
                            accessibilityState={{ disabled: unavailable, selected: isSelected }}
                            disabled={unavailable || deliveryTimeSlotsLocked}
                            onPress={() => setReturnPickupTime(opt.value)}
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
                    <Text style={styles.fieldSubtext}>Demo scheduling only — not a live GrabExpress courier availability slot.</Text>
                  </View>
                </>
              )}

              {!!(effectivePickupTime && effectiveReturnPickupTime && start && end) && (
                <View style={styles.returnTimeCard}>
                  <Text style={styles.returnTimeLabel}>Delivery & Return Schedule</Text>
                  <View style={styles.returnTimeRow}>
                    <Text style={styles.fieldSubtext}>Delivery Arrival</Text>
                    <Text style={styles.returnTimeValue}>{formatDate(start)} · {formatHourAmPm(effectivePickupTime)}</Text>
                  </View>
                  <View style={styles.returnTimeRow}>
                    <Text style={styles.fieldSubtext}>Return Pickup</Text>
                    <Text style={styles.returnTimeValue}>{formatDate(end)} · {formatHourAmPm(effectiveReturnPickupTime)}</Text>
                  </View>
                </View>
              )}

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
            <View style={styles.deliveryAddressSection} onLayout={(e) => setAddressSectionY(e.nativeEvent.layout.y)}>
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
                          maxWidth: "100%",
                          flexShrink: 1,
                          paddingHorizontal: 8,
                          paddingVertical: 5,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor:
                            selectedDemoAddressIndex === index
                              ? colors.blue
                              : colors.border,
                          backgroundColor:
                            selectedDemoAddressIndex === index
                              ? colors.paleBlue
                              : colors.white,
                        }}
                      >
                        <Text style={[s.caption, { flexShrink: 1, fontSize: 12, lineHeight: 16 }]}>
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
                      onChangeText={onRecipientNameChange}
                      placeholder="Full Name"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Mobile (+60)</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={deliveryPhone}
                      onChangeText={onDeliveryPhoneChange}
                      placeholder="+60 12 345 6789"
                    />
                  </View>
                </View>

                <View>
                  <Text style={styles.inputLabel}>Street Address</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={streetAddress}
                    onChangeText={onStreetAddressChange}
                    placeholder="Street name & number"
                  />
                </View>

                <View>
                  <Text style={styles.inputLabel}>Building / Apartment / Unit (Optional)</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={unit}
                    onChangeText={onUnitChange}
                    placeholder="Unit, floor or building"
                  />
                </View>

                <View style={styles.addressFieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Postcode</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={postcode}
                      onChangeText={onPostcodeChange}
                      placeholder="47500"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>City</Text>
                    <TextInput
                      style={styles.addressInput}
                      value={city}
                      onChangeText={onCityChange}
                      placeholder="City or district"
                    />
                  </View>
                </View>

                <MalaysiaStateSelector
                  value={stateName}
                  onChange={onStateNameChange}
                  labelStyle={styles.inputLabel}
                  inputStyle={styles.addressInput}
                  valueStyle={{ fontSize: 12 }}
                />

                <View>
                  <Text style={styles.inputLabel}>Delivery Instructions (Optional)</Text>
                  <TextInput
                    style={styles.addressInput}
                    value={deliveryNotes}
                    onChangeText={onDeliveryNotesChange}
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
                <Ionicons name="shield-checkmark" size={16} color={PANEL_SUCCESS} />
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

            {/* Rental Protection (Optional) — demo only, 5% of the total rental fee */}
            {renterRisk?.level !== "very_high" && quote && (
              <View style={[styles.insuranceCard, insuranceSelected && styles.insuranceCardSelected]}>
                <View style={styles.insuranceHeaderRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.blue} />
                  <Text style={styles.insuranceTitle}>Rental Protection (Optional)</Text>
                </View>
                <Text style={styles.insuranceDescription}>Add optional protection for eligible accidental damage during your rental.</Text>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: insuranceSelected }}
                  accessibilityLabel="Add Rental Protection"
                  onPress={() => setInsuranceSelected((value) => !value)}
                  style={styles.insuranceRow}
                >
                  <View style={[styles.checkbox, insuranceSelected && styles.checkboxChecked]}>
                    {insuranceSelected && <Ionicons name="checkmark" size={14} color={colors.white} />}
                  </View>
                  <Text style={styles.insuranceCheckboxLabel}>Add Rental Protection</Text>
                  <Text style={styles.insurancePremium}>+{money(calculateProtectionFee(quote.rentalFee))}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setShowInsuranceDetails(true)}>
                  <Text style={styles.insuranceLink}>View Protection Details</Text>
                </Pressable>
              </View>
            )}

            <Modal
              visible={showInsuranceDetails}
              transparent
              animationType="fade"
              onRequestClose={() => setShowInsuranceDetails(false)}
            >
              <Pressable style={styles.calendarModalOverlay} onPress={() => setShowInsuranceDetails(false)}>
                <Pressable style={styles.insuranceModalCard} onPress={() => {}}>
                  <ScrollView contentContainerStyle={{ gap: 6 }} showsVerticalScrollIndicator>
                  <Text style={s.h2}>Rental Protection (Demo)</Text>
                  {!!quote && (() => {
                    const replacementValue = listing.estimatedValue || 0;
                    const protectionFee = calculateProtectionFee(quote.rentalFee);
                    const protectionLimit = calculateProtectionLimit(replacementValue);
                    const needsReview = requiresProtectionEligibilityReview(replacementValue);
                    return (
                      <>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Total Rental Fee</Text>
                          <Text style={styles.summaryValue}>{money(quote.rentalFee)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Protection Rate</Text>
                          <Text style={styles.summaryValue}>5%</Text>
                        </View>
                        <Text style={[s.body, { marginTop: 10, fontWeight: "700" }]}>
                          Protection Fee: {money(quote.rentalFee)} × 5% = {money(protectionFee)}
                        </Text>
                        <View style={[styles.summaryRow, { marginTop: 10 }]}>
                          <Text style={styles.summaryLabel}>Item Replacement Value</Text>
                          <Text style={styles.summaryValue}>{money(replacementValue)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Proposed Protection Limit</Text>
                          <Text style={styles.summaryValue}>{money(protectionLimit)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Proposed Maximum</Text>
                          <Text style={styles.summaryValue}>{money(RENTAL_PROTECTION_LIMIT_CAP)}</Text>
                        </View>
                        {needsReview && (
                          <Text style={[s.caption, { color: colors.danger, marginTop: 4 }]}>
                            This item's replacement value exceeds the proposed RM{RENTAL_PROTECTION_LIMIT_CAP.toLocaleString()} maximum and is flagged for manual protection eligibility review.
                          </Text>
                        )}
                        <Text style={s.caption}>
                          The protection fee is calculated from the total rental fee. Rental duration is already reflected in that fee, so there's no minimum charge and no seven-day billing period.
                        </Text>
                      </>
                    );
                  })()}
                  <Text style={[s.body, { marginTop: 10, fontWeight: "700" }]}>
                    Proposed Protection Limit: Up to RM{RENTAL_PROTECTION_LIMIT_CAP.toLocaleString()} (Demo)
                  </Text>
                  <Text style={s.body}>
                    The proposed coverage limit is based on the item's replacement value, subject to the RM{RENTAL_PROTECTION_LIMIT_CAP.toLocaleString()} maximum and eligibility review. This is a proposed maximum exposure, not an automatically guaranteed payout.
                  </Text>
                  <Text style={s.body}>
                    The protection fee is non-refundable once the applicable protected rental has begun, subject to the demonstrated cancellation terms. Your refundable security deposit remains separate from the protection fee.
                  </Text>
                  <Text style={s.caption}>
                    This is a demonstration rental damage-protection model, not an issued insurance policy. The pricing is informed by published rental protection services, while the proposed RM{RENTAL_PROTECTION_LIMIT_CAP.toLocaleString()} limit is based on an industry example. Actual coverage, eligibility, claims and pricing require agreement with a licensed insurance provider or an appropriately established protection programme.
                  </Text>
                  <Button secondary onPress={() => setShowInsuranceDetails(false)}>Close</Button>
                  </ScrollView>
                </Pressable>
              </Pressable>
            </Modal>

            {/* Booking Summary for eligible direct renters — grouped into "Paid to CurRENT" and
                "Delivery · GrabExpress (Demo)" so the renter sees one combined total before renting. */}
            {renterRisk?.level !== "very_high" && quote && (() => {
              // The fee preview only needs the locality fields (postcode/city/state); it must
              // never wait on recipient name/phone, which are unrelated to distance estimation.
              const hasAddress = deliveryLocalityIsComplete();
              const deliveryFeeValue = hasAddress && ((deliveryEstimate && returnDeliveryEstimate) || (courierEstimate && returnCourierEstimate)) ? twoWayDeliveryFee : null;
              const totals = getBookingTotals(quote, deliveryFeeValue);
              const depositTierNote = renterRisk?.canDirectBook
                ? `Your ${renterRisk.label} tier sets a ${
                    renterRisk.level === "low"
                      ? "5% (capped at RM500)"
                      : renterRisk.level === "medium"
                      ? "10% (capped at RM1,000)"
                      : "15% (capped at RM1,500)"
                  } refundable deposit based on replacement value. Released automatically upon verified clean return.`
                : "Sign in and complete demo eKYC to view your risk-based deposit.";
              const totalLabel = renterRisk?.canDirectBook && hasAddress && totals.grandTotal != null
                ? "Total for this rental" : "Estimated total";
              const totalValue = renterRisk?.canDirectBook && hasAddress && totals.grandTotal != null
                ? totals.grandTotal : totals.subtotal;
              return (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>Booking Summary</Text>

                  <Text style={styles.summarySectionLabel}>Paid to CurRENT</Text>
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
                  {insuranceSelected && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Rental Protection (Optional)
                      </Text>
                      <Text style={styles.summaryValue}>
                        {money(quote.protection)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Refundable security deposit
                    </Text>
                    <Text style={styles.summaryValue}>
                      {money(quote.deposit)}
                    </Text>
                  </View>
                  <Text style={styles.depositNote}>{depositTierNote}</Text>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { fontWeight: "700" }]}>Subtotal</Text>
                    <Text style={[styles.summaryValue, { fontWeight: "700" }]}>{money(totals.subtotal)}</Text>
                  </View>

                  <View style={styles.summaryDivider} />
                  <Text style={styles.summarySectionLabel}>
                    {isCourierDelivery ? "Domestic Courier (Demo)" : "Delivery · GrabExpress (Demo)"}
                  </Text>
                  {hasAddress ? (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                          {isCourierDelivery ? "Calculated Two-Way Postage" : "Calculated Delivery Fee (two-way)"}
                        </Text>
                        <Text style={styles.summaryValue}>
                          {deliveryFeeValue != null ? money(deliveryFeeValue) : "—"}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>
                          {isCourierDelivery ? "Automatically Selected Courier" : "Automatically Selected Vehicle"}
                        </Text>
                        <Text style={styles.summaryValue}>
                          {isCourierDelivery ? (courierEstimate ? DOMESTIC_COURIER_NAME : "Unavailable") : (deliveryEstimate?.vehicle || "Unavailable")}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Payment Status</Text><Text style={styles.summaryValue}>{checkoutBooking?.deliveryDemo?.status === "paid_demo" && !deliveryDetailsChanged ? "Paid (Demo)" : "Awaiting Payment"}</Text></View>
                      {!deliveryEstimate && !courierEstimate && (
                        <Text style={styles.deliveryIssueText}>{deliveryIssue.message}</Text>
                      )}
                      <Pressable accessibilityRole="button" onPress={() => setShowDeliveryDetails(true)}>
                        <Text style={styles.summaryLinkText}>View Postage Details</Text>
                      </Pressable>
                      <Modal
                        visible={showDeliveryDetails}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setShowDeliveryDetails(false)}
                      >
                        <Pressable style={styles.calendarModalOverlay} onPress={() => setShowDeliveryDetails(false)}>
                          <Pressable style={styles.insuranceModalCard} onPress={() => {}}>
                            <ScrollView contentContainerStyle={{ gap: 6 }} showsVerticalScrollIndicator>
                            <Text style={s.h2}>{isCourierDelivery ? "Postage Details (Demo)" : "Delivery Details (Demo)"}</Text>
                      {showDeliveryDetails && deliveryEstimate && returnDeliveryEstimate && (
                        <View style={styles.deliveryDetails}>
                          <Row label="Pickup Location" value={listing.privateMeetingVenue || listing.location} />
                          <Row label="Delivery Address" value={currentDeliveryAddress} />
                          <Row label="Estimated Distance (Demo)" value={`${deliveryEstimate.distanceKm} km (estimated, not a measured route)`} />
                          <Row label="Vehicle" value={deliveryEstimate.vehicle} />
                          <Row label="Payment status" value={checkoutBooking?.deliveryDemo?.status === "paid_demo" && !deliveryDetailsChanged ? "Paid (Demo)" : "Awaiting Payment"} />
                          <Row label="Rate" value={deliveryRateDescription(deliveryEstimate.area, deliveryEstimate.vehicle)} />
                          <Row label="Outbound base fare" value={money(deliveryEstimate.baseFare)} />
                          <Row label="Outbound distance charge" value={money(deliveryEstimate.distanceCharge)} />
                          <Row label="Outbound delivery fee (pickup → you)" value={money(deliveryEstimate.fee)} />
                          <Row label="Return delivery fee (you → pickup)" value={money(returnDeliveryEstimate.fee)} />
                          <Row label="Total two-way delivery fee" value={money(twoWayDeliveryFee!)} strong />
                        </View>
                      )}
                      {showDeliveryDetails && courierEstimate && returnCourierEstimate && (
                        <View style={styles.deliveryDetails}>
                          <Row label="Pickup Location" value={listing.privateMeetingVenue || listing.location} />
                          <Row label="Delivery Address" value={currentDeliveryAddress} />
                          <Row label="Courier" value={DOMESTIC_COURIER_NAME} />
                          <Row label="Shipping Zone" value={courierEstimate.zone} />
                          <Row label="Chargeable Weight" value={`${courierEstimate.chargeableWeightKg} kg (volumetric: ${courierEstimate.volumetricWeightKg} kg)`} />
                          {!!listing.parcelPackages?.length && (
                            <Row label="Packages" value={`${listing.parcelPackages.length} packages, priced independently and combined`} />
                          )}
                          <Row label="Payment status" value={checkoutBooking?.deliveryDemo?.status === "paid_demo" && !deliveryDetailsChanged ? "Paid (Demo)" : "Awaiting Payment"} />
                          <Row label="Outbound postage (pickup → you)" value={money(courierEstimate.fee)} />
                          <Row label="Return postage (you → pickup)" value={money(returnCourierEstimate.fee)} />
                          <Row label="Total two-way postage" value={money(twoWayDeliveryFee!)} strong />
                        </View>
                      )}
                            <Button secondary onPress={() => setShowDeliveryDetails(false)}>Close</Button>
                            </ScrollView>
                          </Pressable>
                        </Pressable>
                      </Modal>
                    </>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setScrollToAddressRequestId((n) => n + 1)}
                    >
                      <Text style={styles.summaryLinkText}>Enter your postcode to estimate delivery.</Text>
                    </Pressable>
                  )}

                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRowTotal}>
                    <Text style={styles.summaryTotalLabel}>{totalLabel}</Text>
                    <Text style={styles.summaryTotalValue}>{money(totalValue)}</Text>
                  </View>
                  <Text style={styles.depositNote}>
                    {!renterRisk?.canDirectBook
                      ? "Complete demo eKYC to see your exact deposit and total."
                      : hasAddress && totals.grandTotal != null
                        ? `Includes ${money(quote.deposit)} refundable deposit`
                        : "Delivery fee added once you choose an address"}
                  </Text>
                  {renterRisk?.canDirectBook && hasAddress && deliveryFeeValue != null && !SINGLE_CHECKOUT && (
                    <Text style={styles.depositNote}>
                      You'll pay {money(deliveryFeeValue)} for GrabExpress delivery first, followed by {money(totals.subtotal)} for your rental in the next step.
                    </Text>
                  )}
                </View>
              );
            })()}

            {/* Pickup, Deliver to, Estimated distance and "How is this calculated?" are shown once,
                in the Booking Summary's Delivery section above — not repeated here. */}
            {renterRisk?.level !== "very_high" && quote && (
              <View style={styles.checkoutPanel}>
                <View style={styles.deliveryHeaderRow}>
                  <Ionicons name={isCourierDelivery ? "cube-outline" : "bicycle-outline"} size={16} color={colors.navy} />
                  <Text style={styles.checkoutTitle}>{isCourierDelivery ? "Domestic Courier (Demo)" : "GrabExpress Delivery (Demo)"}</Text>
                </View>
                <Row label="Delivery payment status" value={checkoutBooking?.deliveryDemo?.status === "paid_demo" && !deliveryDetailsChanged ? "Demo Payment Completed" : deliveryDetailsChanged ? "New calculation and payment required" : "Awaiting Payment"} />
                {checkoutBooking?.deliveryDemo?.status === "paid_demo" && !deliveryDetailsChanged
                  ? <Button secondary onPress={() => router.push(`/delivery-demo/${checkoutBooking.id}` as never)}>View Receipt</Button>
                  : <Button disabled={isPaying || !user || !deliveryAddressIsComplete() ||
                      !((deliveryEstimate && returnDeliveryEstimate && effectiveReturnPickupTime) ||
                        (courierEstimate && returnCourierEstimate && returnDispatchDate && dispatchDateFeasible)) ||
                      !!checkoutBooking} onPress={() => void handleDeliveryDemo()}>
                      {twoWayDeliveryFee != null
                        ? `Pay ${isCourierDelivery ? "Postage" : "Delivery"} & Continue · ${money(twoWayDeliveryFee)}`
                        : `Pay ${isCourierDelivery ? "Postage" : "Delivery"} & Continue`}
                    </Button>}
                {checkoutBooking && <Button secondary onPress={async () => {
                  try {
                    await actAndPersist({ type: "cancelDeliveryCheckout", bookingId: checkoutBooking.id });
                    router.replace({ pathname: "/listing/[id]", params: { id } });
                  } catch (e) { setError((e as Error).message); }
                }}>{deliveryDetailsChanged ? "Reset Delivery Checkout" : "Cancel Unfinished Checkout"}</Button>}
              </View>
            )}

            {!!(error || dateError) && (
              <Notice text={error || dateError} error />
            )}

            {!!successNotice && <Notice text={successNotice} />}

            {/* Simulated Checkout Panel */}
            {showCheckout && quote && (
              <>
                <Notice text="Demo payment only. No real funds or banking credentials are collected." />
                <View style={styles.checkoutPanel}>
                  <Text style={styles.checkoutTitle}>CurRENT Rental Payment</Text>
                  <View style={styles.paymentMethodRow}>
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
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Select BNPL payment method"
                      accessibilityState={{ selected: selectedPaymentMethod === "BNPL (Demo)" }}
                      onPress={() => setSelectedPaymentMethod("BNPL (Demo)")}
                      style={[
                        styles.fpxBadgeRow,
                        selectedPaymentMethod === "BNPL (Demo)" && styles.fpxBadgeSelected,
                      ]}
                    >
                      <Ionicons name="wallet-outline" size={16} color="#0369A1" />
                      <Text style={styles.fpxBadgeText}>BNPL</Text>
                      {selectedPaymentMethod === "BNPL (Demo)" && (
                        <Ionicons name="checkmark-circle" size={17} color={colors.blue} />
                      )}
                    </Pressable>
                  </View>
                  <Text style={s.caption}>
                    {selectedPaymentMethod === "BNPL (Demo)"
                      ? "Demo simulation only — pays the same checkout amount as FPX immediately, with no real instalments or credit check."
                      : "Pay the full checkout amount instantly via demo FPX online banking."}
                  </Text>
                  <View>
                    <Button
                      disabled={isPaying || checkoutBooking?.deliveryDemo?.status !== "paid_demo" || deliveryDetailsChanged}
                      loading={isPaying}
                      success={paySuccess}
                      onPress={handleConfirmInstantBook}
                    >
                      Pay
                    </Button>
                    <SuccessBurst trigger={paySuccess} />
                  </View>
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
                      checkoutBooking?.deliveryDemo?.status !== "paid_demo" ||
                      deliveryDetailsChanged ||
                      listing.ownerId === user?.id
                    }
                    onPress={() => setShowCheckout(true)}
                  >
                    {listing.ownerId === user?.id
                      ? "This is your listing"
                      : quote
                        ? `Rent · ${money(SINGLE_CHECKOUT && twoWayDeliveryFee != null ? quote.total + twoWayDeliveryFee : quote.total)}`
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

// Shared booking-panel tokens — every section box (calendar, delivery & return, address,
// Rental Protection, GrabExpress) uses the same fill/border/radius; only Booking Summary is
// deliberately highlighted differently so it reads as the money summary.
const PANEL_SECTION_BG = colors.offWhite; // #F7F8FA
const PANEL_SECTION_BORDER = colors.border; // #D9E3EF
const PANEL_SECTION_RADIUS = 12;
const PANEL_NESTED_BG = colors.white;
const PANEL_NESTED_RADIUS = 10;
const PANEL_SUMMARY_BG = colors.paleBlue; // #EEF4FF
const PANEL_SUMMARY_BORDER = "#C7D7FE";
const PANEL_SUCCESS = "#15803D";

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
    backgroundColor: PANEL_SECTION_BG,
    borderRadius: PANEL_SECTION_RADIUS,
    borderWidth: 1,
    borderColor: PANEL_SECTION_BORDER,
    padding: 16,
    marginTop: 12,
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
    borderRadius: radius.sm,
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
    borderRadius: radius.sm,
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
    backgroundColor: PANEL_SECTION_BG,
    borderWidth: 1,
    borderColor: PANEL_SECTION_BORDER,
    borderRadius: PANEL_SECTION_RADIUS,
    padding: 16,
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
  slotSectionTitle: {
    alignSelf: "stretch",
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
    flexShrink: 1,
  },
  slotSectionDescription: {
    alignSelf: "stretch",
    marginTop: 8,
    fontSize: 11,
    lineHeight: 15,
    color: colors.muted,
    flexShrink: 1,
  },
  slotListLabel: {
    alignSelf: "stretch",
    marginTop: 10,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "600",
    color: colors.navy,
  },
  timeSlotsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignSelf: "stretch",
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
  cancellationNoticeBox: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 2,
    marginTop: 12,
    alignItems: "center",
  },
  cancellationNoticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  insuranceCard: {
    backgroundColor: PANEL_SECTION_BG,
    borderWidth: 1,
    borderColor: PANEL_SECTION_BORDER,
    borderRadius: PANEL_SECTION_RADIUS,
    padding: 16,
    marginTop: 12,
    gap: 6,
  },
  insuranceCardSelected: {
    backgroundColor: colors.paleBlue,
    borderColor: colors.blue,
  },
  insuranceHeaderRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  insuranceTitle: { fontSize: 14, fontWeight: "800", color: colors.navy },
  insuranceDescription: { fontSize: 11, color: colors.muted, lineHeight: 15 },
  insuranceRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
  insuranceCheckboxLabel: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.navy },
  insurancePremium: { fontSize: 13, fontWeight: "800", color: colors.navy },
  insuranceLink: { fontSize: 11, fontWeight: "700", color: colors.blue, marginTop: 2 },
  insuranceModalCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 360,
    maxHeight: "70%",
    alignSelf: "center",
    gap: 6,
  },
  summaryContainer: {
    backgroundColor: PANEL_SUMMARY_BG,
    borderWidth: 1,
    borderColor: PANEL_SUMMARY_BORDER,
    borderRadius: PANEL_SECTION_RADIUS,
    padding: 16,
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
  summarySectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 4,
    marginBottom: 2,
  },
  summaryLinkText: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 2,
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
    borderRadius: radius.sm,
    padding: 10,
    gap: 4,
  },
  reviewApplicationMetaItem: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: "600",
  },
  checkoutPanel: {
    backgroundColor: PANEL_SECTION_BG,
    borderWidth: 1,
    borderColor: PANEL_SECTION_BORDER,
    borderRadius: PANEL_SECTION_RADIUS,
    padding: 16,
    marginTop: 12,
    gap: 10,
  },
  deliveryInputs: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  deliveryInput: { minWidth: 65, flexGrow: 1, flexBasis: 70, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 9, paddingVertical: 8, color: colors.navy },
  deliveryVehicles: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  deliveryVehicle: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.white },
  deliveryVehicleSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  deliveryHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  deliverySummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  deliverySummaryLabel: { fontSize: 12, color: colors.muted, flexShrink: 0 },
  deliverySummaryValue: { fontSize: 12, fontWeight: "600", color: colors.navy, flexShrink: 1, textAlign: "right" },
  deliveryFeeValue: { fontSize: 14, fontWeight: "800", color: colors.navy },
  deliveryIssueText: { fontSize: 12, color: colors.muted },
  deliveryIssueAction: { fontSize: 12, fontWeight: "700", color: colors.blue },
  deliveryToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  deliveryToggleText: { fontSize: 12, fontWeight: "700", color: colors.blue },
  deliveryDetails: { gap: 8, paddingTop: 2 },
  deliveryDetailLabel: { fontSize: 11, fontWeight: "600", color: colors.navy },
  checkoutTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.navy,
  },
  paymentMethodRow: {
    flexDirection: "row",
    gap: 8,
  },
  fpxBadgeRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: radius.sm,
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
    borderRadius: radius.sm,
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
    backgroundColor: PANEL_NESTED_BG,
    borderWidth: 1,
    borderColor: PANEL_SECTION_BORDER,
    borderRadius: PANEL_NESTED_RADIUS,
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
    backgroundColor: PANEL_SECTION_BG,
    borderWidth: 1,
    borderColor: PANEL_SECTION_BORDER,
    borderRadius: PANEL_SECTION_RADIUS,
    padding: 16,
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
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.navy,
  },
});
