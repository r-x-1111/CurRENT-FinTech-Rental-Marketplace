import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { colors } from "../constants/theme";

export function Footer() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        {/* Top footer row */}
        <View
          style={[
            styles.topRow,
            { flexDirection: isDesktop ? "row" : "column", gap: isDesktop ? 40 : 28 },
          ]}
        >
          {/* Brand & info */}
          <View style={{ flex: 1, gap: 10 }}>
            <Text style={styles.brandText}>
              Cur<Text style={{ color: colors.blue }}>RENT</Text>
              <Text style={styles.brandDot}> ●</Text>
            </Text>
            <Text style={styles.tagline}>
              Rent what you need. Earn from what you own.
            </Text>
            <Text style={styles.description}>
              A focused peer-to-peer rental marketplace for Klang Valley. Connecting
              creators, freelancers, students and equipment owners safely.
            </Text>
          </View>

          {/* Links column: Trust and Support */}
          <View style={styles.linkCol}>
            <Text style={styles.colTitle}>Trust & Support</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/how-it-works")}
            >
              <Text style={styles.linkText}>How CurRENT Works</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/trust")}
            >
              <Text style={styles.linkText}>Trust</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/faq")}
            >
              <Text style={styles.linkText}>FAQ</Text>
            </Pressable>
          </View>

          {/* Links column: Account */}
          <View style={styles.linkCol}>
            <Text style={styles.colTitle}>Account</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/rentals")}
            >
              <Text style={styles.linkText}>Your rentals</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/owner")}
            >
              <Text style={styles.linkText}>Lender Listing</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Text style={styles.linkText}>Profile & Risk Score</Text>
            </Pressable>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Legal Disclaimers */}
        <View style={styles.bottom}>
          <Text style={styles.disclaimer}>
            CurRENT relies on authorised external providers for eKYC, payment
            processing, deposit handling and eligible item protection. CurRENT is
            not a bank, insurer, identity authority or licensed escrow provider.
            Provider terms and eligibility conditions apply.
          </Text>
          <Text style={styles.copyright}>
            © 2026 CurRENT · Academic Demonstration Prototype · Klang Valley, Malaysia
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.navy,
    paddingVertical: 44,
    paddingHorizontal: 22,
    marginTop: 40,
  },
  inner: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
  },
  topRow: {
    justifyContent: "space-between",
  },
  brandText: {
    fontSize: 26,
    fontWeight: "900",
    color: "white",
    letterSpacing: -1,
  },
  brandDot: {
    color: colors.blue,
    fontSize: 12,
  },
  tagline: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DCEBFF",
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: "#8FA3BF",
    maxWidth: 380,
  },
  linkCol: {
    gap: 12,
    minWidth: 140,
  },
  colTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
    marginBottom: 4,
  },
  linkText: {
    fontSize: 13,
    color: "#C5D2E2",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#1E3557",
    marginVertical: 28,
  },
  bottom: {
    gap: 12,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 18,
    color: "#8FA3BF",
  },
  copyright: {
    fontSize: 11,
    color: "#6B82A1",
    fontWeight: "500",
  },
});

