import { useCallback, useEffect, useRef, useState } from "react";
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
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
import { getDefaultDeliveryAddress } from "../../services/deliveryAddresses";
import type { SavedDeliveryAddress } from "../../types/marketplace";
import {
  availability,
  availabilityCalendar,
  allowsFutureDemoAvailability,
  calculateProtectionBasePremium,
  calculateProtectionFee,
  calculateProtectionLimit,
  requiresProtectionEligibilityReview,
  RENTAL_PROTECTION_LIMIT_CAP,
  RENTAL_PROTECTION_MINIMUM_FEE,
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
import { bookingTypography } from "../../constants/bookingTypography";
import type { CollectionMethod } from "../../types";
import { newId } from "../../services/marketplace";
import { GuestAuthPrompt } from "../../components/GuestAuth";
import { SuccessBurst } from "../../components/SuccessBurst";
import { MalaysiaStateSelector } from "../../components/MalaysiaStateSelector";
import { estimatePostcodeDistance, resolvePostcodeCoordinate } from "../../services/geo";
import { addDaysToDateString, CROSS_STATE_BOOKING_WARNING, CROSS_STATE_ELIGIBILITY_BADGE, CROSS_STATE_ELIGIBILITY_EXPLANATION, crossStateDeliveryEligibility, deliveryRateDescription, DOMESTIC_COURIER_NAME, estimatedCourierTransitDays, hasReliableCourierTransitEstimate, isDispatchDateFeasible, quoteAutomaticDomesticCourier, quoteAutomaticVehicleDelivery, recommendDispatchDate } from "../../services/delivery";

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

function formatDeliveryAddress(address: SavedDeliveryAddress) {
  return [
    address.recipientName.trim(),
    address.phone.trim(),
    address.addressLine1.trim(),
    address.addressLine2.trim(),
    `${address.postcode.trim()} ${address.city.trim()}`,
    address.state.trim(),
    address.instructions.trim(),
  ].filter(Boolean).join(", ");
}

export default function ListingDetailScreen() {
  const { id, checkoutId } = useLocalSearchParams<{ id: string; checkoutId?: string }>();
  const { state, user, act, actAndPersist } = useMarketplace();
  const listing = state.listings.find((l) => l.id === id);
  const futureDemoDates = !!listing && allowsFutureDemoAvailability(state, listing);
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

  // The Demo Account preselects a fixed presentation date range (2 days) instead of
  // "tomorrow" — normal accounts keep the existing relative default unchanged.
  const [start, setStart] = useState(
    checkoutBooking ? malaysiaDateKey(checkoutBooking.start)
      : state.mode === "admin_demo" ? "2026-10-26" : dateAfter(1),
  );
  const [end, setEnd] = useState(
    checkoutBooking ? malaysiaDateKey(checkoutBooking.end)
      : state.mode === "admin_demo" ? "2026-10-28" : dateAfter(3),
  );
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
  // Lock the time-slot pickers only once the delivery fee has actually been paid for this
  // checkout — an in-progress, unpaid checkout record must not block the renter from still
  // adjusting their pickup/return time before paying.
  const deliveryTimeSlotsLocked = checkoutBooking?.deliveryDemo?.status === "paid_demo";
  // Renter-selected courier collection time. This must always be the same clock hour as the
  // delivery arrival time above — any other combination would visually suggest a rental period
  // that isn't an exact 24-hour multiple, even though billing itself already ignores this field.
  // Locking it here keeps what's shown consistent with what's actually charged.
  const [returnPickupTime, setReturnPickupTime] = useState(checkoutBooking?.returnPickupTime || "");
  const returnSlotUnavailable = (slot: string) => {
    // Only the slot matching the delivery arrival time ever produces a valid 24-hour-multiple
    // rental period; every other slot is disabled regardless of demo availability.
    if (slot !== effectivePickupTime) return true;
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
  // Keep the return pickup selection in lock-step with the delivery arrival time: auto-select
  // the one valid matching slot, and clear a previous selection the instant it stops matching
  // (e.g. the renter changes the arrival time or the rental dates).
  useEffect(() => {
    if (deliveryTimeSlotsLocked) return;
    if (!effectivePickupTime) return;
    if (returnPickupTime === effectivePickupTime) return;
    if (!returnSlotUnavailable(effectivePickupTime)) {
      setReturnPickupTime(effectivePickupTime);
    } else if (returnPickupTime) {
      setReturnPickupTime("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectivePickupTime, start, end, deliveryTimeSlotsLocked]);
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
  const [showEligibilityPopup, setShowEligibilityPopup] = useState(false);
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

  const savedAddresses = user?.savedDeliveryAddresses || [];
  const accountDefault = getDefaultDeliveryAddress(user);
  const checkoutAddress = checkoutBooking?.deliveryAddressDetails ||
    savedAddresses.find((address) => formatDeliveryAddress(address) === checkoutBooking?.deliveryAddress);
  const checkoutSavedIndex = checkoutAddress
    ? savedAddresses.findIndex((address) => formatDeliveryAddress(address) === formatDeliveryAddress(checkoutAddress))
    : -1;
  const initialAddress = checkoutBooking ? checkoutAddress : accountDefault?.address;
  const defaultKey = JSON.stringify(accountDefault);
  const checkoutAddressKey = JSON.stringify(checkoutAddress);

  // Delivery Address state per README V3.23 Section 7.2
  const [recipientName, setRecipientName] = useState(initialAddress?.recipientName || user?.name || "");
  const [deliveryPhone, setDeliveryPhone] = useState(initialAddress?.phone || user?.phone || "");
  const [streetAddress, setStreetAddress] = useState(initialAddress?.addressLine1 || "");
  const [unit, setUnit] = useState(initialAddress?.addressLine2 || "");
  // When resuming an existing checkout, the postcode must start as whatever the paid delivery
  // fee was actually calculated against — not whatever happens to be in the account's general
  // saved address — otherwise this field silently disagrees with the paid booking and the
  // "delivery details changed" guard permanently blocks the rental Pay button.
  const [postcode, setPostcode] = useState(checkoutBooking?.deliveryPostcode || initialAddress?.postcode || "");
  const [city, setCity] = useState(initialAddress?.city || "");
  const [stateName, setStateName] = useState(initialAddress?.state || "");
  const [deliveryNotes, setDeliveryNotes] = useState(initialAddress?.instructions || "");
  // Saved addresses and default-address selection work the same way for every account —
  // demo and normal — since both read/write the same Profile fields.
  const [selectedSavedAddressIndex, setSelectedSavedAddressIndex] = useState<number | null>(
    checkoutBooking ? (checkoutSavedIndex >= 0 ? checkoutSavedIndex : null) : accountDefault?.index ?? null,
  );
  // Always collapsed behind "+ Add Delivery Details" to begin with — including for a
  // brand-new account with zero saved addresses. It only opens when the renter explicitly
  // clicks Add or Edit, the same for every account type; the empty state ("No saved
  // delivery details yet.") is shown instead until then, never the form itself.
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [setAsDefaultChecked, setSetAsDefaultChecked] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  // Every saved record is visible by default (so, e.g., the Demo Account's 3 sample
  // addresses are all shown, not hidden behind an extra click) whenever there's more
  // than one to show. "Hide other addresses" can still collapse down to just the
  // compact selected-address card, and "Change Address" re-expands it; selecting a
  // record from the expanded list does not force it back to collapsed.
  const [addressListExpanded, setAddressListExpanded] = useState(savedAddresses.length > 1);
  // Tracks the actual Supabase/demo-session persistence write, not just the in-memory
  // reducer update, so the Save/Edit/Delete/Set-as-Default actions can show a real
  // loading state and only report success once the write has actually completed.
  const [addressActionBusy, setAddressActionBusy] = useState(false);

  // A fresh listing visit starts from the account default. A manual choice stays on this
  // screen only; returning to it or opening another listing resets that temporary choice.
  // An unfinished checkout instead restores the address captured for that booking.
  useFocusEffect(useCallback(() => {
    const address = checkoutId ? checkoutAddress : accountDefault?.address;
    setRecipientName(address?.recipientName || user?.name || "");
    setDeliveryPhone(address?.phone || user?.phone || "");
    setStreetAddress(address?.addressLine1 || "");
    setUnit(address?.addressLine2 || "");
    setPostcode(checkoutId ? checkoutBooking?.deliveryPostcode || address?.postcode || "" : address?.postcode || "");
    setCity(address?.city || "");
    setStateName(address?.state || "");
    setDeliveryNotes(address?.instructions || "");
    setSelectedSavedAddressIndex(checkoutId ? checkoutSavedIndex >= 0 ? checkoutSavedIndex : null : accountDefault?.index ?? null);
    setAddressFormOpen(false);
    setEditingAddressIndex(null);
  }, [id, checkoutId, user?.id, user?.name, user?.phone, defaultKey,
    checkoutBooking?.id, checkoutBooking?.deliveryPostcode, checkoutAddressKey, checkoutSavedIndex]));

  const onRecipientNameChange = setRecipientName;
  const onDeliveryPhoneChange = setDeliveryPhone;
  const onStreetAddressChange = setStreetAddress;
  const onUnitChange = setUnit;
  function onPostcodeChange(value: string) {
    setPostcode(value);
    // Auto-populate city/state from the postcode reference dataset — the renter should never
    // have to type the full address just to see a delivery estimate (Stage 1: postcode only).
    const resolved = resolvePostcodeCoordinate(value);
    if (resolved) {
      setCity(resolved.area);
      setStateName(resolved.state);
    }
  }
  const onCityChange = setCity;
  const onStateNameChange = setStateName;
  const onDeliveryNotesChange = setDeliveryNotes;

  const { width } = useWindowDimensions();
  // Shared booking-interface typography scale (see constants/bookingTypography.ts): main section
  // headings, subheadings and the final total step down one size on mobile widths.
  const typeMobile = width < 768;
  const sectionHeadingStyle = bookingTypography.sectionHeading(typeMobile);
  const subheadingStyle = bookingTypography.subheading(typeMobile);
  const totalAmountStyle = bookingTypography.totalAmount(typeMobile);

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
  const compactSelectedAddressIndex = selectedSavedAddressIndex !== null && savedAddresses[selectedSavedAddressIndex]
    ? selectedSavedAddressIndex : null;
  const compactSelectedAddress = compactSelectedAddressIndex !== null
    ? savedAddresses[compactSelectedAddressIndex] : undefined;
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
  // Cross-state detection compares the pickup and delivery postcodes' actual recorded states —
  // independent of whether GrabExpress's limited pricing brackets happen to cover the route — so
  // a renter entering an out-of-state address sees the right reason immediately, even before a
  // courier quote is attempted.
  const deliveryRoute = deliveryLocalityIsComplete() ? estimatePostcodeDistance(listing.pickupPostcode, postcode) : null;
  const isActuallyCrossState = !!deliveryRoute && deliveryRoute.pickup.state.trim().toLowerCase() !== deliveryRoute.delivery.state.trim().toLowerCase();
  const listingCrossStateEligibility = crossStateDeliveryEligibility(listing);
  const crossStateBlocked = isActuallyCrossState && listingCrossStateEligibility !== "available";
  const twoWayDeliveryFee = deliveryEstimate && returnDeliveryEstimate
    ? Math.round((deliveryEstimate.fee + returnDeliveryEstimate.fee) * 100) / 100
    : courierEstimate && returnCourierEstimate
    ? Math.round((courierEstimate.fee + returnCourierEstimate.fee) * 100) / 100
    : null;
  // J&T Express's own published Peninsular Malaysia estimate; East Malaysia has no equivalent
  // published reference this demo can cite, so hasEstimate is false there (see
  // hasReliableCourierTransitEstimate) and the UI shows "Pending Update" instead.
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
        deliveryPostcode: postcode, deliveryAddressDetails: address,
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
        "Complete the required Delivery Information fields before paying: recipient name, phone, street address, postcode, city, and state.",
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

  // Choosing a saved address only fills the form for THIS booking — it must not change
  // the account's default address (see setAsDefaultAddress for that).
  function selectSavedAddress(index: number) {
    const address = savedAddresses[index];
    if (!address) return;
    setSelectedSavedAddressIndex(index);
    setRecipientName(address.recipientName);
    setDeliveryPhone(address.phone);
    setStreetAddress(address.addressLine1);
    setUnit(address.addressLine2);
    setPostcode(address.postcode);
    setCity(address.city);
    setStateName(address.state);
    setDeliveryNotes(address.instructions);
    setSetAsDefaultChecked(!!address.isDefault);
    setEditingAddressIndex(null);
    setAddressFormOpen(false);
  }

  async function setAsDefaultAddress(index: number) {
    setAddressActionBusy(true);
    try {
      await actAndPersist({ type: "setDefaultDeliveryAddress", index });
      selectSavedAddress(index);
      setSetAsDefaultChecked(true);
      setError("");
      setSuccessNotice("Default delivery address updated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAddressActionBusy(false);
    }
  }

  // Opens a blank form for a brand-new saved address (distinct from editing one in place).
  function openAddAddressForm() {
    setEditingAddressIndex(null);
    setRecipientName(user?.name || "");
    setDeliveryPhone(user?.phone || "");
    setStreetAddress("");
    setUnit("");
    setPostcode("");
    setCity("");
    setStateName("");
    setDeliveryNotes("");
    setSetAsDefaultChecked(false);
    setAddressFormOpen(true);
    setAddressListExpanded(false);
  }

  function openEditAddressForm(index: number) {
    const address = savedAddresses[index];
    if (!address) return;
    setEditingAddressIndex(index);
    setRecipientName(address.recipientName);
    setDeliveryPhone(address.phone);
    setStreetAddress(address.addressLine1);
    setUnit(address.addressLine2);
    setPostcode(address.postcode);
    setCity(address.city);
    setStateName(address.state);
    setDeliveryNotes(address.instructions);
    setSetAsDefaultChecked(!!address.isDefault);
    setAddressFormOpen(true);
    setAddressListExpanded(false);
  }

  async function handleSaveDeliveryAddress() {
    if (!user) {
      setAuthPrompt(true);
      return;
    }
    if (addressActionBusy) return;
    setAddressActionBusy(true);
    setError("");
    try {
      const normalized = getDeliveryAddress();
      // Mirrors the reducer's own duplicate-matching so the newly saved (or edited)
      // address can be selected for this booking immediately, without waiting on a
      // re-render to read back its index from the account's saved-address list.
      const targetIndex =
        editingAddressIndex ??
        (() => {
          const existing = savedAddresses.findIndex(
            (saved) =>
              saved.addressLine1.trim() === normalized.addressLine1.trim() &&
              saved.addressLine2.trim() === normalized.addressLine2.trim() &&
              saved.postcode.trim() === normalized.postcode.trim() &&
              saved.city.trim() === normalized.city.trim() &&
              saved.state.trim() === normalized.state.trim(),
          );
          return existing >= 0 ? existing : savedAddresses.length;
        })();
      // Waits for the actual account-workspace write (Supabase for normal accounts, the
      // demo session store for Demo Accounts) to finish — and rolls the in-memory state
      // back out — before reporting success, rather than optimistically assuming an
      // in-memory reducer update alone means the details were actually saved.
      await actAndPersist({
        type: "saveDeliveryAddress",
        address: normalized,
        index: editingAddressIndex ?? undefined,
        setDefault: setAsDefaultChecked,
      });
      setSelectedSavedAddressIndex(targetIndex);
      setEditingAddressIndex(null);
      setAddressFormOpen(false);
      // Keep the full saved-address list visible after adding or editing an address.
      // The Add form collapses it while open; otherwise existing entries appear to vanish
      // until a refresh remounts this screen with the list expanded again.
      setAddressListExpanded(true);
      setSuccessNotice("Delivery details saved to your profile.");
    } catch (e) {
      // The form stays open with everything the renter typed intact, so they can fix
      // whatever's wrong (or just retry a flaky connection) without retyping anything.
      setError((e as Error).message);
    } finally {
      setAddressActionBusy(false);
    }
  }

  function requestDeleteAddress(index: number) {
    setPendingDeleteIndex(index);
  }

  function cancelDeleteAddress() {
    setPendingDeleteIndex(null);
  }

  async function confirmDeleteAddress() {
    const index = pendingDeleteIndex;
    if (index === null) return;
    setAddressActionBusy(true);
    try {
      await actAndPersist({ type: "deleteDeliveryAddress", index });
      setError("");
      setSuccessNotice("Delivery details removed.");
      if (editingAddressIndex === index) {
        setEditingAddressIndex(null);
        setAddressFormOpen(false);
      }
      const remaining = savedAddresses.filter((_, i) => i !== index);
      if (selectedSavedAddressIndex === index) {
        const nextIndex = remaining.findIndex((address) => address.isDefault);
        const next = nextIndex >= 0 ? remaining[nextIndex] : undefined;
        setSelectedSavedAddressIndex(nextIndex >= 0 ? nextIndex : null);
        setRecipientName(next?.recipientName || user?.name || "");
        setDeliveryPhone(next?.phone || user?.phone || "");
        setStreetAddress(next?.addressLine1 || "");
        setUnit(next?.addressLine2 || "");
        setPostcode(next?.postcode || "");
        setCity(next?.city || "");
        setStateName(next?.state || "");
        setDeliveryNotes(next?.instructions || "");
      } else if (selectedSavedAddressIndex !== null && selectedSavedAddressIndex > index) {
        setSelectedSavedAddressIndex(selectedSavedAddressIndex - 1);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPendingDeleteIndex(null);
      setAddressActionBusy(false);
    }
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

          <Text style={[s.body, { marginTop: 20, marginBottom: 8 }]}>
            {listing.description}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${CROSS_STATE_ELIGIBILITY_BADGE[listingCrossStateEligibility]}. View delivery eligibility explanation`}
            onPress={() => setShowEligibilityPopup(true)}
            style={{ marginBottom: 20, alignSelf: "flex-start" }}
          >
            <Badge
              text={CROSS_STATE_ELIGIBILITY_BADGE[listingCrossStateEligibility]}
              tone={listingCrossStateEligibility === "available" ? "green" : listingCrossStateEligibility === "same_state_only" ? "amber" : "blue"}
            />
          </Pressable>
          <Modal visible={showEligibilityPopup} transparent animationType="fade" onRequestClose={() => setShowEligibilityPopup(false)}>
            <Pressable style={styles.calendarModalOverlay} onPress={() => setShowEligibilityPopup(false)}>
              <Pressable style={styles.insuranceModalCard} onPress={() => {}}>
                <Text style={s.h2}>{CROSS_STATE_ELIGIBILITY_BADGE[listingCrossStateEligibility]}</Text>
                <Text style={s.caption}>Delivery eligibility is automatically determined using the item's packaged weight, dimensions and shipping requirements.</Text>
                <Button secondary onPress={() => setShowEligibilityPopup(false)}>Close</Button>
              </Pressable>
            </Pressable>
          </Modal>

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
            {/* Header: Price */}
            <View style={styles.bookingCardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={bookingTypography.dailyPrice(typeMobile)}>
                  {money(listing.dailyPrice)}
                  <Text style={bookingTypography.note}> / day</Text>
                </Text>
              </View>
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
                  disabled={!futureDemoDates && calendarYear >= 2026 && calendarMonthIndex >= 11}
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
                            accessibilityState={{ selected, disabled: calendarPicker === "year" && !futureDemoDates && option.value > 2026 }}
                            disabled={calendarPicker === "year" && !futureDemoDates && option.value > 2026}
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
                                calendarPicker === "year" && !futureDemoDates && option.value > 2026 && { color: colors.muted, opacity: 0.45 },
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
                <Text style={sectionHeadingStyle}>
                  Delivery & Return Arrangement
                </Text>
              </View>

              {crossStateBlocked ? (
                <View style={styles.crossStateWarningBox}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.crossStateWarningTitle}>
                      {CROSS_STATE_BOOKING_WARNING[listingCrossStateEligibility as "same_state_only" | "requires_review"].title}
                    </Text>
                    <Text style={styles.crossStateWarningText}>
                      {CROSS_STATE_BOOKING_WARNING[listingCrossStateEligibility as "same_state_only" | "requires_review"].body}
                    </Text>
                  </View>
                </View>
              ) : !deliveryLocalityIsComplete() ? (
                // Never guess a route before the renter actually has a destination — showing
                // either the same-state slot picker or a cross-state courier schedule here
                // would misrepresent a route that hasn't been determined yet.
                <View style={{ marginTop: 8 }}>
                  <Text style={subheadingStyle}>Add a Delivery Address to See Scheduling</Text>
                  <Text style={styles.slotSectionDescription}>
                    Enter your delivery postcode in Delivery Information below to determine whether this is a same-state or cross-state delivery and calculate the fee.
                  </Text>
                </View>
              ) : isCourierDelivery ? (
                !dispatchDateFeasible ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={subheadingStyle}>Selected Rental Dates Unavailable for Courier Delivery</Text>
                    <Text style={styles.slotSectionDescription}>
                      Your selected rental start date does not allow sufficient estimated shipping time. Please choose a later rental date.
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.slotSectionDescription}>
                      Cross-state courier delivery and return dates are subject to transit conditions and courier availability. Exact arrival and pickup times cannot be guaranteed.
                    </Text>
                    {/* Outbound Shipping — CurRENT recommends the dispatch date automatically; the
                        renter never schedules the lender's courier pickup directly. The lender
                        confirms (or proposes an alternate) via Confirm Outbound Dispatch
                        Arrangement on their Rental Details screen once the booking is paid. */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={subheadingStyle}>Preferred Delivery Date</Text>
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
                        Estimated Arrival: {estimatedDeliveryRange ? `${estimatedDeliveryRange.start} – ${estimatedDeliveryRange.end}` : "Pending Update"}
                      </Text>
                    </View>

                    {/* Return Shipping — CurRENT suggests the return drop-off date from the agreed
                        rental end date; the renter can request a different date, but this is a
                        courier branch drop-off, not a scheduled pickup — the renter never
                        arranges courier collection. */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={subheadingStyle}>Planned Return Date</Text>
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
                        Estimated Return Arrival: {estimatedReturnRange ? `${estimatedReturnRange.start} – ${estimatedReturnRange.end}` : "Pending Update"}
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
                    <Text style={subheadingStyle}>Scheduled Delivery Arrival Time</Text>
                    <Text style={styles.slotSectionDescription}>
                      Select your preferred time for the item to arrive at your delivery address. This is a preferred time, not a guaranteed courier appointment.
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
                    <Text style={subheadingStyle}>Scheduled Return Pickup Time</Text>
                    <Text style={styles.slotSectionDescription}>
                      Select your preferred time for the courier to collect the item from your address and return it to the owner. This is a preferred time, not a guaranteed courier appointment.
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

              {/* Cross-state courier bookings never had a renter-selected hour to show here —
                  effectivePickupTime silently defaults to a fallback slot even when no GrabExpress
                  time slot was ever rendered, which used to display a fabricated hour (e.g.
                  "11 AM") on a route where only a date, never a time, was ever agreed. */}
              {!isCourierDelivery && !!(effectivePickupTime && effectiveReturnPickupTime && start && end) && (
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
                  <Text style={sectionHeadingStyle}>Fulfilment</Text>
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
                <Text style={sectionHeadingStyle}>Delivery Information</Text>
              </View>

              {savedAddresses.length > 0 ? (
                <View style={{ gap: 8, marginTop: 10 }}>
                  <Text style={styles.inputLabel}>Saved Delivery Details</Text>
                  {compactSelectedAddressIndex === null && !deliveryAddressIsComplete() && (
                    <Text style={styles.fieldSubtext}>Select a saved address or add a new one for this booking.</Text>
                  )}

                  {!addressListExpanded && !!compactSelectedAddress ? (
                    // Compact card: only the currently selected record, one line of
                    // recipient info + one concise address line, no repeated headings.
                    <View style={styles.compactAddressCard}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <View style={styles.selectedAddressBadge}>
                          <Ionicons name="checkmark-circle" size={12} color={colors.blue} />
                          <Text style={styles.selectedAddressBadgeText}>Selected</Text>
                        </View>
                        {!!compactSelectedAddress.isDefault && (
                          <View style={styles.defaultAddressBadge}>
                            <Text style={styles.defaultAddressBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[s.caption, { fontSize: 12, lineHeight: 16, fontWeight: "700", color: colors.navy }]}>
                        {compactSelectedAddress.recipientName} · {compactSelectedAddress.phone}
                      </Text>
                      <Text style={[s.caption, { fontSize: 12, lineHeight: 16 }]}>
                        {[
                          compactSelectedAddress.addressLine1,
                          compactSelectedAddress.addressLine2,
                          `${compactSelectedAddress.postcode} ${compactSelectedAddress.city}`,
                          compactSelectedAddress.state,
                        ].filter(Boolean).join(", ")}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 14, alignItems: "center", marginTop: 2 }}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Edit delivery details"
                          onPress={() => compactSelectedAddressIndex !== null && openEditAddressForm(compactSelectedAddressIndex)}
                          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                        >
                          <Ionicons name="pencil-outline" size={13} color={colors.blue} />
                          <Text style={[s.caption, { fontSize: 11, color: colors.blue }]}>Edit</Text>
                        </Pressable>
                        {savedAddresses.length > 1 && (
                          <Pressable accessibilityRole="button" onPress={() => setAddressListExpanded(true)}>
                            <Text style={[s.caption, { fontSize: 11, color: colors.blue, fontWeight: "700" }]}>
                              Change Address
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ) : (
                    // Expanded: every saved record in a compact 2–3-line row, with the
                    // secondary management actions (Set as Default / Edit / Delete) here
                    // instead of cluttering the default compact card above.
                    <View style={{ gap: 6 }}>
                      {savedAddresses.map((address, index) => {
                        const isSelected = compactSelectedAddressIndex === index;
                        const isDefault = !!address.isDefault;
                        return (
                          // A plain View, never a Pressable/button: it contains the "Set as
                          // Default"/"Edit"/"Delete" Pressables below, and react-native-web
                          // renders accessibilityRole="button" as an actual <button> —
                          // nesting one button inside another is invalid HTML and breaks
                          // hydration on web. The "select this address" tap target lives on
                          // the info block beneath instead, with no interactive descendants.
                          <View
                            key={`${address.postcode}-${address.addressLine1}-${index}`}
                            style={[styles.compactAddressRow, isSelected && styles.compactAddressRowSelected]}
                          >
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Select this saved address for the current booking"
                              accessibilityState={{ selected: isSelected }}
                              onPress={() => selectSavedAddress(index)}
                              style={{ gap: 2 }}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                {isSelected && (
                                  <View style={styles.selectedAddressBadge}>
                                    <Ionicons name="checkmark-circle" size={12} color={colors.blue} />
                                    <Text style={styles.selectedAddressBadgeText}>Selected</Text>
                                  </View>
                                )}
                                {isDefault && (
                                  <View style={styles.defaultAddressBadge}>
                                    <Text style={styles.defaultAddressBadgeText}>Default</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[s.caption, { fontSize: 12, lineHeight: 16, fontWeight: "700", color: colors.navy }]} numberOfLines={1}>
                                {address.recipientName} · {address.phone}
                              </Text>
                              <Text style={[s.caption, { fontSize: 12, lineHeight: 16 }]} numberOfLines={2}>
                                {[
                                  address.addressLine1,
                                  address.addressLine2,
                                  `${address.postcode} ${address.city}`,
                                  address.state,
                                ].filter(Boolean).join(", ")}
                              </Text>
                            </Pressable>
                            <View style={{ flexDirection: "row", gap: 14, alignItems: "center", marginTop: 2 }}>
                              {!isDefault && (
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => setAsDefaultAddress(index)}
                                >
                                  <Text style={[s.caption, { fontSize: 11, color: colors.blue }]}>
                                    Set as Default
                                  </Text>
                                </Pressable>
                              )}
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Edit delivery details"
                                onPress={() => openEditAddressForm(index)}
                                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                              >
                                <Ionicons name="pencil-outline" size={13} color={colors.blue} />
                                <Text style={[s.caption, { fontSize: 11, color: colors.blue }]}>
                                  Edit
                                </Text>
                              </Pressable>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Delete delivery details"
                                onPress={() => requestDeleteAddress(index)}
                                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                              >
                                <Ionicons name="trash-outline" size={13} color={colors.danger} />
                                <Text style={[s.caption, { fontSize: 11, color: colors.danger }]}>
                                  Delete
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                      <Pressable accessibilityRole="button" onPress={() => setAddressListExpanded(false)}>
                        <Text style={[s.caption, { fontSize: 11, color: colors.blue, fontWeight: "700" }]}>
                          Hide other addresses
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={[styles.fieldSubtext, { marginTop: 10 }]}>
                  No saved delivery details yet.
                </Text>
              )}

              {user && !addressFormOpen && (
                <Button secondary onPress={openAddAddressForm}>
                  + Add Delivery Details
                </Button>
              )}

              {pendingDeleteIndex !== null && savedAddresses[pendingDeleteIndex] && (
                <View style={styles.deleteConfirmBox}>
                  <Text style={styles.deleteConfirmText}>
                    Delete the saved delivery details at {savedAddresses[pendingDeleteIndex].addressLine1}, {savedAddresses[pendingDeleteIndex].city}? This cannot be undone.
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Button secondary onPress={cancelDeleteAddress} disabled={addressActionBusy}>
                        Cancel
                      </Button>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button onPress={confirmDeleteAddress} loading={addressActionBusy}>
                        {addressActionBusy ? "Deleting…" : "Delete"}
                      </Button>
                    </View>
                  </View>
                </View>
              )}

              {addressFormOpen && (
                <>
                  <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                    {editingAddressIndex !== null ? "Edit Delivery Details" : "Add Delivery Details"}
                  </Text>
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

                    {savedAddresses.length > 0 && (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: setAsDefaultChecked }}
                        aria-checked={setAsDefaultChecked}
                        accessibilityLabel="Set as Default Address"
                        onPress={() => setSetAsDefaultChecked((value) => !value)}
                        style={styles.insuranceRow}
                      >
                        <View style={[styles.checkbox, setAsDefaultChecked && styles.checkboxChecked]}>
                          {setAsDefaultChecked && <Ionicons name="checkmark" size={14} color={colors.white} />}
                        </View>
                        <Text style={styles.insuranceCheckboxLabel}>Set as Default Address</Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      {user && (
                        <Button secondary onPress={handleSaveDeliveryAddress} loading={addressActionBusy}>
                          {addressActionBusy
                            ? "Saving…"
                            : editingAddressIndex !== null
                            ? "Save Changes"
                            : "Save Address"}
                        </Button>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        secondary
                        onPress={() => {
                          setEditingAddressIndex(null);
                          setAddressFormOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </View>
                  </View>
                </>
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

            {/* Optional third-party Rental Protection (demo): prorated 0.3% rate, RM5 minimum */}
            {renterRisk?.level !== "very_high" && quote && (
              <View style={[styles.insuranceCard, insuranceSelected && styles.insuranceCardSelected]}>
                <View style={styles.insuranceHeaderRow}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={colors.blue} />
                  <Text style={sectionHeadingStyle}>Rental Protection (Optional — Third-Party Insurance Demo)</Text>
                </View>
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
                  <Text style={styles.insurancePremium}>+{money(calculateProtectionFee(listing.estimatedValue || 0, quote.days))}</Text>
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
                  <Text style={s.h2}>Rental Protection Details (Demo)</Text>
                  <Text style={s.caption}>
                    Optional third-party insurance protection for eligible accidental damage. Demo only — no actual insurance policy has been issued.
                  </Text>
                  {!!quote && (() => {
                    const replacementValue = listing.estimatedValue || 0;
                    const basePremium = calculateProtectionBasePremium(replacementValue, quote.days);
                    const protectionFee = calculateProtectionFee(replacementValue, quote.days);
                    const protectionLimit = calculateProtectionLimit(replacementValue);
                    const needsReview = requiresProtectionEligibilityReview(replacementValue);
                    return (
                      <>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Item Fair / Replacement Value</Text>
                          <Text style={styles.summaryValue}>{money(replacementValue)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Protection Rate</Text>
                          <Text style={styles.summaryValue}>0.3% per 7 days</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Rental Duration</Text>
                          <Text style={styles.summaryValue}>{quote.days} {quote.days === 1 ? "day" : "days"}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Minimum Protection Fee</Text>
                          <Text style={styles.summaryValue}>{money(RENTAL_PROTECTION_MINIMUM_FEE)}</Text>
                        </View>
                        <Text style={s.caption}>Protection Fee = MAX(RM5, Item Fair Value × 0.003 × Rental Days / 7)</Text>
                        <Text style={s.body}>Calculated Premium: {money(replacementValue)} × 0.003 × ({quote.days} / 7) = {money(basePremium)}</Text>
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { fontWeight: "700" }]}>Final Protection Fee</Text>
                          <Text style={[styles.summaryValue, { fontWeight: "700" }]}>{money(protectionFee)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Proposed Protection Limit</Text>
                          <Text style={styles.summaryValue}>{money(protectionLimit)}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>Proposed Maximum Coverage</Text>
                          <Text style={styles.summaryValue}>{money(RENTAL_PROTECTION_LIMIT_CAP)}</Text>
                        </View>
                        {needsReview && (
                          <Text style={[s.caption, { color: colors.danger, marginTop: 2 }]}>
                            This item's replacement value exceeds the proposed maximum and is flagged for manual eligibility review.
                          </Text>
                        )}
                        <Text style={s.caption}>Your protection fee is calculated using the item's fair value and rental duration. A minimum fee of RM5 applies per booking. The seven-day rate is prorated, rather than charged in full for every started week.</Text>
                      </>
                    );
                  })()}

                  <Text style={s.caption}>
                    This is a simulated third-party insurance concept. The 0.3% rate, RM5 minimum and proposed coverage limit are illustrative assumptions, not quotations or policy terms approved by an insurance company. Actual premiums, eligibility, coverage, exclusions and claim decisions would be determined by a licensed third-party insurer.
                  </Text>
                  <Text style={s.caption}>
                    CurRENT would facilitate selection, simulated payment, incident reporting and claim submission, but would not act as the insurer. The insurer's policy would determine who can formally submit a claim. Your refundable security deposit remains separate, and courier damage is handled through the delivery company's claims process. See the FAQ for full terms.
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
                  <Text style={[sectionHeadingStyle, { marginBottom: 10 }]}>Booking Summary</Text>

                  <Text style={[bookingTypography.smallLabel, styles.summarySectionLabel]}>Paid to CurRENT</Text>
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
                  <Text style={[bookingTypography.smallLabel, styles.summarySectionLabel]}>
                    {isCourierDelivery ? "Domestic Courier (Demo)" : "Delivery · GrabExpress (Demo)"}
                  </Text>
                  {crossStateBlocked ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Delivery fee</Text>
                      <Text style={[styles.summaryValue, { color: colors.danger }]}>Cross-State Delivery Unavailable</Text>
                    </View>
                  ) : hasAddress ? (
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
                            <Text style={styles.fieldSubtext}>Cross-state delivery eligibility is automatically assessed from this item's packaged weight, dimensions and shipping characteristics. This is a simulated assessment, not a confirmed courier acceptance.</Text>
                      {showDeliveryDetails && deliveryEstimate && returnDeliveryEstimate && (
                        <View style={styles.deliveryDetails}>
                          <Row label="Pickup Location" value={listing.privateMeetingVenue || listing.location} />
                          <Row label="Delivery Address" value={currentDeliveryAddress} />
                          <Row label="Estimated Distance (Demo)" value={`${deliveryEstimate.distanceKm} km (estimated, not a measured route)`} />
                          <Text style={styles.fieldSubtext}>
                            The lender's pickup postcode and your destination postcode are resolved to approximate coordinates. CurRENT estimates straight-line distance between them and multiplies it by 1.3 as an assumed road-distance adjustment. The resulting approximate kilometres feed the selected Motorcycle, Car or MPV rate. This is not a live driving-distance quotation.
                          </Text>
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
                          <Text style={styles.fieldSubtext}>
                            Domestic courier postage uses the pickup and destination postcodes to identify the shipping region. Volumetric weight = length × width × height ÷ 6000; chargeable weight is the greater of actual and volumetric weight, rounded up to 0.5 kg. CurRENT applies its configured shipping-zone rate to each package, then combines separate outbound and return charges. Kilometre-based local rates do not apply. This is not a live J&T Express quotation.
                          </Text>
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
                    <Text style={subheadingStyle}>{totalLabel}</Text>
                    <Text style={totalAmountStyle}>{money(totalValue)}</Text>
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
                  <Text style={sectionHeadingStyle}>{isCourierDelivery ? "Domestic Courier (Demo)" : "GrabExpress Delivery (Demo)"}</Text>
                </View>
                <Row label="Delivery payment status" value={checkoutBooking?.deliveryDemo?.status === "paid_demo" && !deliveryDetailsChanged ? "Demo Payment Completed" : deliveryDetailsChanged ? "New calculation and payment required" : "Awaiting Payment"} />
                {checkoutBooking?.deliveryDemo?.status === "paid_demo" && !deliveryDetailsChanged
                  ? <Button secondary onPress={() => router.push(`/delivery-demo/${checkoutBooking.id}` as never)}>View Receipt</Button>
                  : <Button disabled={isPaying || !user || !deliveryAddressIsComplete() || crossStateBlocked ||
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
                  <Text style={sectionHeadingStyle}>CurRENT Rental Payment</Text>
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
                      : "Complete your payment securely through an authorised payment provider."}
                  </Text>
                  <View>
                    <Button
                      disabled={isPaying || checkoutBooking?.deliveryDemo?.status !== "paid_demo" || deliveryDetailsChanged}
                      loading={isPaying}
                      success={paySuccess}
                      onPress={handleConfirmInstantBook}
                    >
                      Proceed to Secure Payment
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
                      crossStateBlocked ||
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
                      Complete the required Delivery Information fields before selecting Pay.
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
    marginTop: 20,
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
  // arrangementTitle unused directly — "Delivery & Return Arrangement" / "Delivery Information"
  // now render with the shared sectionHeadingStyle.
  fieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  // fieldLabel unused directly — "Fulfilment" now renders with the shared sectionHeadingStyle.
  fieldSubtext: {
    fontSize: 10,
    color: colors.muted,
  },
  // slotSectionTitle unused directly — section subheadings ("Scheduled Delivery Arrival Time",
  // "Scheduled Return Pickup Time") now render with the shared subheadingStyle.
  slotSectionDescription: {
    alignSelf: "stretch",
    marginTop: 6,
    flexShrink: 1,
    ...bookingTypography.description,
  },
  slotListLabel: {
    alignSelf: "stretch",
    marginTop: 10,
    marginBottom: 8,
    ...bookingTypography.fieldLabel,
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
  timeSlotText: { ...bookingTypography.timeSlotButton },
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
  crossStateWarningBox: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    alignItems: "flex-start",
  },
  crossStateWarningTitle: { fontSize: 13, fontWeight: "700", color: colors.navy, marginBottom: 2 },
  crossStateWarningText: { fontSize: 12, lineHeight: 17, color: colors.navy },
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
    marginTop: 20,
    gap: 6,
  },
  insuranceCardSelected: {
    backgroundColor: colors.paleBlue,
    borderColor: colors.blue,
  },
  insuranceHeaderRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  // insuranceTitle unused directly — "Rental Protection (Optional · Demo)" now renders with the
  // shared sectionHeadingStyle so it matches every other main section heading.
  insuranceDescription: { ...bookingTypography.description, lineHeight: 20 },
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
  defaultAddressBadge: {
    backgroundColor: colors.paleBlue,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultAddressBadgeText: { fontSize: 10, fontWeight: "700", color: colors.blue },
  selectedAddressBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectedAddressBadgeText: { fontSize: 10, fontWeight: "700", color: colors.blue },
  compactAddressCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.blue,
    backgroundColor: colors.paleBlue,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  compactAddressRow: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  compactAddressRowSelected: { borderColor: colors.blue, backgroundColor: colors.paleBlue },
  deleteConfirmBox: {
    backgroundColor: colors.offWhite,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 8,
    marginTop: 8,
  },
  deleteConfirmText: { fontSize: 12, lineHeight: 17, color: colors.text },
  insuranceCheckboxLabel: { flex: 1, ...bookingTypography.fieldLabel },
  insurancePremium: { ...bookingTypography.pricingValue },
  insuranceLink: { fontSize: 13, fontWeight: "700", color: bookingTypography.action.color, marginTop: 2 },
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
    marginTop: 20,
  },
  // summaryTitle unused directly — "Booking Summary" now renders with the shared
  // sectionHeadingStyle (kept the marginBottom via an inline style on that Text).
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },
  summaryLabel: { fontSize: 13, fontWeight: "400", color: bookingTypography.description.color },
  summarySectionLabel: {
    // Font size/weight/colour come from the shared subheading style (see sectionHeadingStyle /
    // subheadingStyle above); this entry only adds the extra vertical spacing.
    marginTop: 4,
    marginBottom: 2,
  },
  summaryLinkText: {
    fontSize: 13,
    color: bookingTypography.action.color,
    fontWeight: "600",
    marginTop: 2,
    marginBottom: 2,
  },
  summaryValue: { ...bookingTypography.pricingValue, textAlign: "right" },
  depositNote: {
    ...bookingTypography.note,
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
  // summaryTotalLabel / summaryTotalValue unused directly — "Total for this rental" now renders
  // with the shared subheadingStyle (label) and totalAmountStyle (value).
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
    marginTop: 20,
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
  // checkoutTitle unused directly — "GrabExpress Delivery (Demo)" / "CurRENT Rental Payment" now
  // render with the shared sectionHeadingStyle.
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
    marginTop: 20,
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
    ...bookingTypography.fieldLabel,
    marginBottom: 4,
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
