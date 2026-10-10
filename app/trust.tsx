import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Notice, Screen, Section, s } from "../components/ui";
import { RiskGauge } from "../components/RiskGauge";
import { colors } from "../constants/theme";

export default function TrustScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  return (
    <Screen
      back
      title="Trust"
      subtitle="Confidence, built into the journey. Simple signals and partner-supported services help renters and owners make better decisions before booking."
    >
      <Notice text="CurRENT is an academic classroom demonstration in Klang Valley. Real identity checks, payments, deposit escrow, BNPL, item insurance and delivery would be supported by external authorised partners. No real money or personal data is collected." />

      <Section title="Why CurRENT Is Safer" />
      <View
        style={[
          styles.trustGrid,
          { flexDirection: isDesktop ? "row" : "column" },
        ]}
      >
        {/* Trust Card 1: Verified Users */}
        <View style={styles.trustCard}>
          <View style={styles.trustIconContainer}>
            <Ionicons
              name="shield-checkmark"
              size={26}
              color={colors.blue}
            />
          </View>
          <Text style={styles.trustCardTitle}>Verified Users</Text>
          <Text style={styles.trustCardBody}>
            Identity checks are completed by authorised external eKYC
            providers before booking (simulated in demo). New verified renters begin at score 75 Medium.
          </Text>
        </View>

        {/* Trust Card 2: Rental Risk Score with Gauge Visual */}
        <View style={[styles.trustCard, styles.trustCardFeatured]}>
          <View style={styles.trustIconContainerFeatured}>
            <Ionicons name="speedometer-outline" size={26} color="#38BDF8" />
          </View>
          <Text style={styles.trustCardTitleFeatured}>Renter Rental Risk Score</Text>
          <RiskGauge
            score={75}
            label="Medium Risk"
          />
          <Text style={styles.trustCardBodyFeatured}>
            Assessed based on identity verification, rental history and
            transaction behaviour, and is reassessed after every completed rental.
          </Text>
        </View>

        {/* Trust Card 3: Secure Deposit */}
        <View style={styles.trustCard}>
          <View style={styles.trustIconContainer}>
            <Ionicons name="lock-closed" size={26} color={colors.blue} />
          </View>
          <Text style={styles.trustCardTitle}>Secure Deposit</Text>
          <Text style={styles.trustCardBody}>
            Refundable deposits are shown clearly before you request a rental.
            Released automatically after joint clean return confirmation (No-Issues).
          </Text>
        </View>

        {/* Trust Card 4: Item Protection */}
        <View style={styles.trustCard}>
          <View style={styles.trustIconContainer}>
            <Ionicons name="umbrella" size={26} color={colors.blue} />
          </View>
          <Text style={styles.trustCardTitle}>Item Protection</Text>
          <Text style={styles.trustCardBody}>
            Eligible high-value items may receive protection of up to RM60,000
            through an authorised external insurance partner (future concept).
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  trustGrid: {
    gap: 16,
    flexWrap: "wrap",
    marginVertical: 10,
  },
  trustCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  trustCardFeatured: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  trustIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  trustIconContainerFeatured: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#16335C",
    alignItems: "center",
    justifyContent: "center",
  },
  trustCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
  },
  trustCardTitleFeatured: {
    fontSize: 18,
    fontWeight: "800",
    color: "white",
  },
  trustCardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  trustCardBodyFeatured: {
    fontSize: 13,
    lineHeight: 20,
    color: "#C5D2E2",
    marginTop: 8,
  },
});

