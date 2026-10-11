import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../components/ui";
import { FaqAccordion } from "../components/FaqAccordion";
import { sampleFaqs } from "../data/mock";
import { colors } from "../constants/theme";

export default function FaqScreen() {
  return (
    <Screen back>
      <View style={styles.headerWrap}>
        <Text style={styles.eyebrow}>FAQ</Text>
        <Text style={styles.heading}>Questions, answered.</Text>
      </View>

      {/* Six canonical founder accordion cards */}
      <FaqAccordion faqs={sampleFaqs} />

      {/* Required separate independent demo context note outside accordion cards */}
      <View style={styles.demoNoticeCard}>
        <Text style={styles.demoNoticeText}>
          CurRENT is an academic demonstration. External eKYC, deposit-handling and BNPL providers are not connected. FPX payments and deposits are simulated; BNPL is not currently available in the demo.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.blue,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.navy,
  },
  demoNoticeCard: {
    backgroundColor: "#F0F4F8",
    borderWidth: 1,
    borderColor: "#D9E3EF",
    borderRadius: 12,
    padding: 14,
    marginTop: 24,
    marginBottom: 16,
  },
  demoNoticeText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
});
