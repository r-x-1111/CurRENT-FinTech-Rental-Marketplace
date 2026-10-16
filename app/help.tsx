import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Notice, Screen, Section, s } from "../components/ui";
import { FaqAccordion } from "../components/FaqAccordion";
import { sampleFaqs } from "../data/mock";
import { colors } from "../constants/theme";

export default function HelpScreen() {
  return (
    <Screen
      back
      title="Help & Trust"
      subtitle="Practical answers and safety rules for peer-to-peer rentals."
    >
      <Notice text="CurRENT is a classroom simulation. Identity checks, payments, deposits, insurance and delivery are not performed by real providers. Do not submit identity documents or bank credentials." />

      {/* Step-by-Step Rental Workflow */}
      <Section title="How CurRENT Works" />
      <Card>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>1</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.stepTitle}>Browse & Select Dates</Text>
            <Text style={s.caption}>
              Browse available listings across Malaysia. Select your dates using the 2-click calendar and view your transparent rental rate, 5% service fee, and risk-based deposit.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>2</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.stepTitle}>Instant Booking & Secure Simulated Checkout</Text>
            <Text style={s.caption}>
              Eligible renters (scores 30–100) confirm immediately upon simulated checkout — no owner approval required. Renters scoring 0–29 submit a CurRENT Platform Review request.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>3</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.stepTitle}>Delivery & Check-in</Text>
            <Text style={s.caption}>
              The rental becomes Active at its scheduled start time. Confirm Received records delivery only; it does not change the rental clock. The renter records check-in condition with the required photos and video.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>4</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.stepTitle}>Clean Return & Deposit Release</Text>
            <Text style={s.caption}>
              At the scheduled end, the renter submits check-out evidence (at least 6 photos and 1 video) and confirms return. The lender reviews the same evidence and may end the rental without issue or apply a dispute. Deposit release and any score change follow the final simulated outcome.
            </Text>
          </View>
        </View>
      </Card>

      {/* Trust & Safety Highlights */}
      <Section title="Trust & Safety Highlights" />
      <Card>
        <View style={{ gap: 14 }}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark" size={22} color={colors.blue} />
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>Simulated Identity (eKYC)</Text>
              <Text style={s.caption}>
                Demo identity checks verify renters before booking. New verified renters start at 80 Low Risk.
              </Text>
            </View>
          </View>

          <View style={styles.trustItem}>
            <Ionicons name="speedometer-outline" size={22} color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>Rental Risk Score</Text>
              <Text style={s.caption}>
                Transparent 4-tier schedule (80–100 Low: 5%, 40–79 Medium: 10%, 30–39 High: 15%, 0–29 Very High: Platform review). Single winning incident rule ensures only the highest adjustment applies per rental.
              </Text>
            </View>
          </View>

          <View style={styles.trustItem}>
            <Ionicons name="lock-closed" size={22} color={colors.blue} />
            <View style={{ flex: 1 }}>
              <Text style={s.h2}>Deposit Protection & Dispute Safeguard</Text>
              <Text style={s.caption}>
                Deposits are held safely and released only upon joint clean return confirmation. Any dispute pauses release for platform review.
              </Text>
            </View>
          </View>

          <Button secondary onPress={() => router.push("/(tabs)/rentals")}>
            View Your Rentals Hub →
          </Button>
        </View>
      </Card>

      {/* Canonical 13 FAQs Accordion */}
      <Section title="Frequently Asked Questions (Section 14)" />
      <FaqAccordion faqs={sampleFaqs} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 6,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.paleBlue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.blue,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  stepDivider: {
    height: 1,
    backgroundColor: colors.lightGrey,
    marginVertical: 4,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
});
