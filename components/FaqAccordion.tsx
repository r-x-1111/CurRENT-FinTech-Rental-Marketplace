import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import type { FaqItem } from "../data/mock";

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(
    () => new Set(faqs.map((_, i) => i)),
  );

  function toggle(index: number) {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <View style={styles.container}>
      {faqs.map((faq, index) => {
        const isOpen = openIndices.has(index);
        return (
          <View
            key={faq.question}
            style={[
              styles.item,
              isOpen && { borderColor: colors.softBlue },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              onPress={() => toggle(index)}
              style={styles.header}
            >
              <Text style={styles.question}>
                {faq.question}
              </Text>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={isOpen ? colors.blue : colors.navy}
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
    borderColor: "#DDEAFF",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#C5DBFA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    gap: 16,
  },
  question: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
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
