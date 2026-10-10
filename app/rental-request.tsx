import { Image, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Button, Card, Empty, Screen } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { money } from "../services/booking";
import { colors } from "../constants/theme";

function formatDate(dateStr: string) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function RentalRequestScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    listingId?: string;
  }>();

  const { state, user } = useMarketplace();

  if (!user) {
    return <Redirect href="/auth" />;
  }

  // Retrieve requested application by ID or fallback
  const req =
    state.platformReviewRequests?.find((r) => r.id === params.id) ||
    state.platformReviewRequests?.find(
      (r) => r.listingId === params.listingId && r.renterId === user?.id,
    ) ||
    (state.platformReviewRequests && state.platformReviewRequests.length > 0
      ? state.platformReviewRequests[0]
      : null);

  if (!req) {
    return (
      <Screen back title="Request to Rent" subtitle="Application Status">
        <Empty
          title="No application found"
          text="No pending platform review request matches this reference. Very High Risk renters (scores 0–29) submit platform review requests directly from item listings."
          action="Back to Rentals"
          onPress={() => router.replace("/(tabs)")}
        />
      </Screen>
    );
  }

  const listing = state.listings.find((l) => l.id === req.listingId);
  const owner = state.profiles.find((p) => p.id === listing?.ownerId);
  const lenderDisplay = req.lenderName || owner?.name || "Lender";
  const itemImage = req.image || listing?.imageUrl;
  const isRequesterOrAdmin = !user || user.id === req.renterId || state.mode === "admin_demo";

  return (
    <Screen back title="Request to Rent" subtitle="CurRENT Platform Application">
      <Card>
        {/* Status Header */}
        <View style={styles.successIconHeader}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={40} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Request Submitted</Text>
          <Text style={styles.successSubtitle}>
            Your rental request has been submitted to CurRENT for platform review.
          </Text>
          <View style={styles.statusBadgeWrap}>
            <Badge text="Pending CurRENT Review (Demo)" green />
          </View>
        </View>

        {/* Item Summary Header */}
        <View style={styles.itemHeader}>
          {itemImage ? (
            <Image source={{ uri: itemImage }} style={styles.itemThumb} />
          ) : (
            <View style={styles.itemThumb} />
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.itemTitle}>{req.title}</Text>
            <Text style={styles.itemSub}>
              📍 {req.location || listing?.location || "Kuala Lumpur"} · Delivery Only
            </Text>
            {req.dailyPrice != null && (
              <Text style={styles.itemPrice}>
                {money(req.dailyPrice)}
                <Text style={{ fontSize: 12, fontWeight: "normal", color: colors.muted }}>
                  {" "}
                  / day
                </Text>
              </Text>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Read-only Application Details */}
        <Text style={styles.sectionHeading}>Application Details</Text>
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference ID</Text>
            <Text style={[styles.detailValue, { fontWeight: "800", color: colors.blue }]}>
              {req.id}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lender</Text>
            <Text style={styles.detailValue}>{lenderDisplay}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scheduled Start</Text>
            <Text style={styles.detailValue}>
              {formatDate(req.start)}{req.pickupTime ? `, ${req.pickupTime}` : ""}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scheduled Return</Text>
            <Text style={styles.detailValue}>
              {formatDate(req.end)}{req.returnTime ? `, ${req.returnTime}` : ""}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {req.durationDays || 1} {(req.durationDays || 1) === 1 ? "day" : "days"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fulfilment</Text>
            <Text style={styles.detailValue}>Delivery Only</Text>
          </View>
          {isRequesterOrAdmin && req.deliveryAddress && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Address</Text>
              <Text style={[styles.detailValue, { maxWidth: "60%", textAlign: "right" }]}>
                {req.deliveryAddress}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Rental Fee</Text>
            <Text style={[styles.detailValue, { fontWeight: "800", color: colors.navy }]}>
              {money(req.estimatedRentalFee || 0)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Application Status</Text>
            <Badge text="Pending CurRENT Review (Demo)" />
          </View>
        </View>

        {/* Indicative estimate notice */}
        <View style={styles.indicativeBox}>
          <Ionicons name="information-circle-outline" size={16} color="#0369A1" />
          <Text style={styles.indicativeText}>
            Indicative base rental estimate only. No deposit is calculated and no payment is charged during the platform review stage.
          </Text>
        </View>

        {/* Educational Note */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#0284C7" />
          <Text style={styles.infoText}>
            This application is submitted directly to the CurRENT platform for safety review.
            Lenders do not approve or reject applications, and no inventory is locked.
            You can track your application in <Text style={{ fontWeight: "700" }}>Your Rentals → Platform Review Requests</Text>.
          </Text>
        </View>

        {/* Navigation Buttons */}
        <View style={{ marginTop: 18, gap: 10 }}>
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

const styles = StyleSheet.create({
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
  itemHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    marginTop: 12,
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
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 8,
  },
  detailsCard: {
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: colors.slate,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: "600",
  },
  indicativeBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    alignItems: "center",
  },
  indicativeText: {
    flex: 1,
    fontSize: 12,
    color: colors.navy,
    lineHeight: 16,
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.slate,
    lineHeight: 16,
  },
});
