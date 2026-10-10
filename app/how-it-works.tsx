import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Notice, Screen, Section, s } from "../components/ui";
import { colors } from "../constants/theme";

export default function HowItWorksScreen() {
  return (
    <Screen
      back
      title="How CurRENT Works"
      subtitle="A simple way to rent. Step-by-step guide for peer-to-peer rentals in Klang Valley."
    >
      <Notice text="CurRENT is an academic classroom demonstration in Klang Valley. Real identity checks, payments, deposit escrow, BNPL, item insurance and delivery would be supported by external authorised partners. No real money or personal data is collected." />

      <Section title="A simple way to rent" />
      <Card>
        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>01</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="search-outline" size={18} color={colors.blue} />
              <Text style={styles.stepTitle}>Search</Text>
            </View>
            <Text style={s.caption}>
              Search for the item you need from trusted owners across Klang Valley. Choose from 22 verified listings or filter by 8 categories.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>02</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="calendar-outline" size={18} color={colors.blue} />
              <Text style={styles.stepTitle}>Review</Text>
            </View>
            <Text style={s.caption}>
              Select your rental dates using the 2-click calendar. Review the transparent daily rate, 5% CurRENT service fee (minimum RM5), and refundable risk-based security deposit.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>03</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="card-outline" size={18} color={colors.blue} />
              <Text style={styles.stepTitle}>Pay</Text>
            </View>
            <Text style={s.caption}>
              Complete simulated payment via FPX (no real bank or card details collected). Eligible renters (scores 30–100) confirm instantly without owner approval. Renters scoring 0–29 submit a CurRENT Platform Review request.
            </Text>
          </View>
        </View>

        <View style={styles.stepDivider} />

        <View style={styles.stepRow}>
          <View style={styles.stepNum}>
            <Text style={styles.stepNumText}>04</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="sync-outline" size={18} color={colors.blue} />
              <Text style={styles.stepTitle}>Return</Text>
            </View>
            <Text style={s.caption}>
              Upload return condition evidence (≥6 photos + ≥1 video). Once both renter and lender independently confirm return (No-Issues), the refundable deposit is released and +2 reliability points are awarded.
            </Text>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 10,
  },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.paleBlue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.blue,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.navy,
  },
  stepDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 4,
  },
});

