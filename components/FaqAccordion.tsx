import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/theme";
import type { FaqCoverageRow, FaqItem } from "../data/mock";

const COVERAGE_COLUMNS: { key: keyof FaqCoverageRow; label: string }[] = [
  { key: "situation", label: "Situation" },
  { key: "withProtection", label: "With Rental Protection" },
  { key: "withoutProtection", label: "Without Rental Protection" },
  { key: "deposit", label: "Refundable Security Deposit" },
  { key: "deliveryCompensation", label: "Delivery Company Compensation" },
];

function CoverageTable({ rows }: { rows: FaqCoverageRow[] }) {
  const mobile = useWindowDimensions().width < 768;

  if (mobile) {
    // Stacked scenario cards — five columns squeezed into a phone width is unreadable.
    return (
      <View style={{ gap: 10, marginTop: 8 }}>
        {rows.map((row) => (
          <View key={row.situation} style={tableStyles.mobileCard}>
            <Text style={tableStyles.mobileSituation}>{row.situation}</Text>
            {COVERAGE_COLUMNS.slice(1).map((col) => (
              <View key={col.key} style={tableStyles.mobileRow}>
                <Text style={tableStyles.mobileLabel}>{col.label}</Text>
                <Text style={tableStyles.mobileValue}>{row[col.key]}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 8 }}>
      <View style={tableStyles.table}>
        <View style={[tableStyles.row, tableStyles.headerRow]}>
          {COVERAGE_COLUMNS.map((col) => (
            <Text key={col.key} style={[tableStyles.cell, tableStyles.headerCell]}>
              {col.label}
            </Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View
            key={row.situation}
            style={[tableStyles.row, i % 2 === 1 && tableStyles.rowAlt]}
          >
            {COVERAGE_COLUMNS.map((col) => (
              <Text key={col.key} style={tableStyles.cell}>
                {row[col.key]}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const tableStyles = StyleSheet.create({
  table: { minWidth: 920, borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden" },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: colors.border },
  headerRow: { backgroundColor: colors.navy, borderTopWidth: 0 },
  rowAlt: { backgroundColor: colors.paleBlue },
  cell: { width: 184, padding: 10, fontSize: 12.5, lineHeight: 18, color: colors.navy },
  headerCell: { color: "white", fontWeight: "800", fontSize: 12 },
  mobileCard: {
    backgroundColor: colors.paleBlue,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  mobileSituation: { fontSize: 14, fontWeight: "800", color: colors.navy },
  mobileRow: { gap: 2 },
  mobileLabel: { fontSize: 11, fontWeight: "700", color: colors.muted, textTransform: "uppercase" },
  mobileValue: { fontSize: 13, lineHeight: 19, color: colors.navy },
});

export function FaqAccordion({ faqs }: { faqs: FaqItem[] }) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(() => new Set());

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

  let lastCategory: string | undefined;

  return (
    <View style={styles.container}>
      {faqs.map((faq, index) => {
        const isOpen = openIndices.has(index);
        const showCategoryHeader = faq.category !== lastCategory;
        lastCategory = faq.category;
        return (
          <React.Fragment key={faq.question}>
            {showCategoryHeader && (
              <Text style={styles.categoryHeading}>{faq.category}</Text>
            )}
            <View style={styles.item}>
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
                  {!!faq.coverageTable && <CoverageTable rows={faq.coverageTable} />}
                </View>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  categoryHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.blue,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 2,
  },
  item: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.navy,
    overflow: "hidden",
  },
  header: {
    backgroundColor: colors.paleBlue,
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
    paddingTop: 14,
    borderTopColor: colors.border,
  },
  answer: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
});
