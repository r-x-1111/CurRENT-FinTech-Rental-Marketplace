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
      <Notice text="CurRENT is a classroom simulation. Identity checks, payments, deposits, insurance and delivery are not performed by real providers. Do not submit identity documents or bank credentials." />

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
            providers before booking (simulated in demo). New verified renters begin at score 80 Low.
          </Text>
        </View>

        {/* Trust Card 2: Rental Risk Score with Gauge Visual */}
        <View style={styles.trustCard}>
          <View style={styles.trustIconContainer}>
            <Ionicons name="speedometer-outline" size={26} color={colors.blue} />
          </View>
          <Text style={styles.trustCardTitle}>Renter Rental Risk Score</Text>
          <RiskGauge
            score={80}
            label="Low Risk"
          />
          <Text style={styles.trustCardBody}>
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
            Released after renter return evidence, Confirm Return and lender End Rental — No Issue review without dispute.
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
  trustCardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
  },
  trustCardBody: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
});
