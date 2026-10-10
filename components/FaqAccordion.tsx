import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import type { FaqItem } from "../data/mock";

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <View style={styles.container}>
      {faqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <View key={faq.question} style={styles.item}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              onPress={() => toggle(index)}
              style={styles.header}
            >
              <Text style={styles.question}>{faq.question}</Text>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.navy}
              />
            </Pressable>
            {isOpen && (
              <View style={styles.body}>
                <Text style={styles.answer}>{faq.answer}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  item: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    gap: 16,
  },
  question: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.navy,
    flex: 1,
  },
  body: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 0,
    borderTopColor: colors.border,
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
});

