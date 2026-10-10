import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, Empty, Notice, Screen, s } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { money, rentalDays } from "../services/booking";
import { colors } from "../constants/theme";
import type { CollectionMethod } from "../types";
import { newId } from "../services/marketplace";

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatTime(timeStr: string) {
  const [h, m] = (timeStr || "11:00").split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMin = m || "00";
  return `${displayHour < 10 ? `0${displayHour}` : displayHour}:${displayMin} ${ampm}`;
}

export default function RentalRequestScreen() {
  const params = useLocalSearchParams<{
    listingId: string;
    start: string;
    end: string;
    pickupTime: string;
    returnTime: string;
    collectionMethod: string;
  }>();

  const { state, user, act } = useMarketplace();

  const [submitted, setSubmitted] = useState(false);
  const [submittedRefId, setSubmittedRefId] = useState("");
  const [error, setError] = useState("");

  const listing = state.listings.find((l) => l.id === params.listingId);

  if (!listing) {
    return (
      <Screen back>
        <Empty
          title="Listing not found"
          text="This rental listing could not be loaded."
          action="Back to Rentals"
          onPress={() => router.replace("/(tabs)/explore")}
        />
      </Screen>
    );
  }

  const owner = state.profiles.find((p) => p.id === listing.ownerId);

  const start = params.start || "";
  const end = params.end || "";
  const pickupTime = params.pickupTime || "11:00";
  // Return time strictly auto-matched to pickup time
  const returnTime = params.returnTime || pickupTime;
  const collectionMethod = (params.collectionMethod as CollectionMethod) || "Meet Owner";

  const startTimestamp = `${start}T${pickupTime}:00Z`;
  const endTimestamp = `${end}T${returnTime}:00Z`;

  let days = 1;
  try {
    if (start && end) {
      days = rentalDays(startTimestamp, endTimestamp);
    }
  } catch {
    days = 1;
  }

  const estimatedRentalFee = listing.dailyPrice * days;

  function handleSubmitRequest() {
    if (!user) {
      router.push("/auth");
      return;
    }
    try {
      const refId = `REQ-${newId().slice(0, 8).toUpperCase()}`;
      act({
        type: "requestPlatformReview",
        id: refId,
        listingId: listing!.id,
        start,
        end,
        pickupTime: formatTime(pickupTime),
        returnTime: `${formatTime(returnTime)} (Automatically matched)`,
        durationDays: days,
        collectionMethod,
        location: listing!.location,
        lenderName: owner?.name || "Lender",
        dailyPrice: listing!.dailyPrice,
        estimatedRentalFee,
        notes: "Pending CurRENT Review (Demo). Submitted for platform safety assessment.",
      });
      setSubmittedRefId(refId);
      setSubmitted(true);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Confirmation view after successful submission
  if (submitted) {
    return (
      <Screen back title="Request Submitted" subtitle="CurRENT Platform Application">
        <Card>
          <View style={styles.successIconHeader}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={40} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Request Submitted</Text>
            <Text style={styles.successSubtitle}>
              Your rental request has been submitted to CurRENT for review.
            </Text>
            <View style={styles.statusBadgeWrap}>
              <Badge text="Status: Pending Review" green />
            </View>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference ID</Text>
              <Text style={[styles.detailValue, { fontWeight: "800", color: colors.blue }]}>
                {submittedRefId}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Item</Text>
              <Text style={styles.detailValue}>{listing.title}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lender</Text>
              <Text style={styles.detailValue}>{owner?.name || "Lender"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pickup</Text>
              <Text style={styles.detailValue}>
                {formatDate(start)}, {formatTime(pickupTime)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Return</Text>
              <Text style={styles.detailValue}>
                {formatDate(end)}, {formatTime(returnTime)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{days} {days === 1 ? "day" : "days"}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Collection</Text>
              <Text style={styles.detailValue}>{collectionMethod}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{listing.location}</Text>
            </View>
          </View>

          <View style={styles.confirmationNoticeBox}>
            <Ionicons name="information-circle-outline" size={18} color="#0369A1" />
            <Text style={styles.confirmationNoticeText}>
              You can track your application in{" "}
              <Text style={{ fontWeight: "700" }}>Your Rentals → Platform Review Requests</Text>.
              This request remains pending review. No payment or deposit has been charged.
            </Text>
          </View>

          <View style={{ marginTop: 14, gap: 10 }}>
            <Button onPress={() => router.push("/(tabs)/rentals")}>
              View in Your Rentals
            </Button>
            <Button secondary onPress={() => router.replace("/(tabs)")}>
              Done / Return Home
            </Button>
          </View>
        </Card>
      </Screen>
    );
  }

  // Application Review & Submission View
  return (
    <Screen back title="Request to Rent" subtitle="Application Review">
      <Card>
        {/* Item Summary Header */}
        <View style={styles.itemHeader}>
          <Image source={{ uri: listing.imageUrl }} style={styles.itemThumb} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.itemTitle}>{listing.title}</Text>
            <Text style={styles.itemSub}>
              {listing.location} · {listing.category}
            </Text>
            <Text style={styles.itemPrice}>
              {money(listing.dailyPrice)}
              <Text style={{ fontSize: 12, fontWeight: "normal", color: colors.muted }}>
                {" "}/ day
              </Text>
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Application Details Table */}
        <Text style={styles.sectionHeading}>Rental Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Item</Text>
            <Text style={styles.detailValue}>{listing.title}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lender</Text>
            <Text style={styles.detailValue}>{owner?.name || "Lender"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pickup</Text>
            <Text style={styles.detailValue}>
              {formatDate(start)}, {formatTime(pickupTime)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Return</Text>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.detailValue}>
                {formatDate(end)}, {formatTime(returnTime)}
              </Text>
              <Text style={styles.autoMatchedSub}>Automatically matched</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{days} {days === 1 ? "day" : "days"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Collection</Text>
            <Text style={styles.detailValue}>{collectionMethod}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location</Text>
            <Text style={styles.detailValue}>{listing.location}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated rental fee</Text>
            <Text style={[styles.detailValue, { fontWeight: "700" }]}>
              {money(estimatedRentalFee)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Application Status</Text>
            <Badge text="Draft Application" />
          </View>
        </View>

        {/* Educational Note */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#0284C7" />
          <Text style={styles.infoText}>
            This application is submitted directly to the CurRENT platform for review.
            Lenders do not approve or reject applications.
            No payment is charged today, and no deposit is held during the application stage.
          </Text>
        </View>

        {!!error && <Notice text={error} error />}

        {/* Submit Button */}
        <View style={{ marginTop: 16 }}>
          <Button onPress={handleSubmitRequest}>
            Submit Request to CurRENT
          </Button>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  itemThumb: {
    width: 80,
    height: 75,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
  },
  itemSub: {
    fontSize: 12,
    color: colors.muted,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.blue,
  },
  divider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 8,
  },
  detailsCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: "600",
  },
  autoMatchedSub: {
    fontSize: 10,
    color: "#0284C7",
    fontWeight: "600",
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: "#0369A1",
    lineHeight: 16,
  },
  successIconHeader: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 6,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.navy,
  },
  successSubtitle: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
  },
  statusBadgeWrap: {
    marginTop: 4,
  },
  confirmationNoticeBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    alignItems: "center",
  },
  confirmationNoticeText: {
    flex: 1,
    fontSize: 11,
    color: "#0369A1",
    lineHeight: 16,
  },
});

