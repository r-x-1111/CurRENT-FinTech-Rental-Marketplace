import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Screen, Section, s } from "../components/ui";
import { colors } from "../constants/theme";

export default function HowItWorksScreen() {
  return (
    <Screen
      back
      title="How CurRENT Works"
      subtitle="A simple way to rent. Step-by-step guide for peer-to-peer rentals across Malaysia."
    >
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
              Search for the item you need.
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
              Select your rental dates and review the rental fee, service fee and risk-based deposit.
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
              Complete your payment securely through an authorised payment provider.
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
              At the scheduled end, submit check-out evidence (at least 6 photos and 1 video) and confirm return. The lender reviews the same evidence; a dispute keeps the simulated deposit on hold.
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
    borderWidth: 1,
    borderColor: colors.softBlue,
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
    backgroundColor: colors.border,
    marginVertical: 4,
  },
});
