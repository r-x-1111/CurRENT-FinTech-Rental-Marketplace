import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";

export function RiskGauge({
  score = 75,
  label = "Medium Risk",
}: {
  score?: number | null;
  label?: string;
}) {
  const gradId = React.useId
    ? `riskGaugeGrad_${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
    : "riskGaugeGrad";

  const displayScore = score !== null && score !== undefined ? score : "N/A";
  const displayLabel =
    score !== null && score !== undefined
      ? label ||
        (score >= 80
          ? "Low Risk"
          : score >= 40
          ? "Medium Risk"
          : score >= 30
          ? "High Risk"
          : "Very High Risk")
      : "Unverified";

  // Tier color (V3.15: 80-100 Low, 40-79 Medium, 30-39 High, 0-29 Very High)
  const tierColor =
    score !== null && score !== undefined
      ? score >= 80
        ? "#22C55E" // green (Low)
        : score >= 40
        ? "#F59E0B" // amber (Medium)
        : score >= 30
        ? "#EA580C" // red-orange (High)
        : "#DC2626" // deep/dark red (Very High)
      : colors.muted;

  return (
    <View style={styles.container}>
      {/* SVG Arc for Web (matches Canva dark-navy semicircular speedometer per V3.15) */}
      {Platform.OS === "web" ? (
        <View style={styles.gaugeWrapper}>
          <svg
            width={190}
            height={105}
            viewBox="0 0 190 105"
            style={{ overflow: "visible" }}
          >
            <defs>
              <linearGradient
                id={gradId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                {/* Continuous smoothly blended gradient: Dark red -> lighter red -> amber/yellow -> green */}
                <stop offset="0%" stopColor="#991B1B" />
                <stop offset="14%" stopColor="#DC2626" />
                <stop offset="28%" stopColor="#EA580C" />
                <stop offset="42%" stopColor="#F59E0B" />
                <stop offset="68%" stopColor="#FBBF24" />
                <stop offset="88%" stopColor="#84CC16" />
                <stop offset="100%" stopColor="#22C55E" />
              </linearGradient>
            </defs>
            <path
              d="M 22 95 A 73 73 0 0 1 168 95"
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth="10"
              strokeLinecap="round"
            />
          </svg>
          <View style={styles.centerTextOverlay}>
            <Text style={[styles.scoreText, { color: tierColor }]}>
              {displayScore}
            </Text>
            <Text style={[styles.tierText, { color: tierColor }]}>
              {displayLabel}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.dialOuter, { borderColor: tierColor }]}>
          <View style={styles.dialInner}>
            <Text style={[styles.scoreText, { color: tierColor }]}>
              {displayScore}
            </Text>
            <Text style={[styles.tierText, { color: tierColor }]}>
              {displayLabel}
            </Text>
          </View>
        </View>
      )}

      {/* Scale markers: only 0, 40, 80, 100 (30 omitted per simplified gauge design) */}
      <View style={styles.scaleRow}>
        <Text style={styles.scaleItem}>0</Text>
        <Text style={styles.scaleItem}>40</Text>
        <Text style={styles.scaleItem}>80</Text>
        <Text style={styles.scaleItem}>100</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  gaugeWrapper: {
    width: 190,
    height: 105,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerTextOverlay: {
    position: "absolute",
    bottom: 6,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  tierText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 2,
  },
  dialOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B192C",
  },
  dialInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  scaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 180,
    marginTop: 8,
    paddingHorizontal: 8,
  },
  scaleItem: {
    fontSize: 11,
    color: "#8FA3BF",
    fontWeight: "600",
  },
});
