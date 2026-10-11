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

      <FaqAccordion faqs={sampleFaqs} />
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
});
