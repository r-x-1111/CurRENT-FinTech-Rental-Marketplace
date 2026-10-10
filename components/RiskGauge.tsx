import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/theme";

export function RiskGauge({
  score = 70,
  label = "Low Risk",
}: {
  score?: number | null;
  label?: string;
}) {
  const displayScore = score !== null && score !== undefined ? score : "N/A";
  const displayLabel =
    score !== null && score !== undefined
      ? label || (score >= 70 ? "Low Risk" : score >= 40 ? "Medium Risk" : score >= 30 ? "High Risk" : "Very High Risk")
      : "Unverified";

  // Tier color (matches CurRENT specifications & screenshot)
  const tierColor =
    score !== null && score !== undefined
      ? score >= 70
        ? "#22C55E" // green
        : score >= 40
        ? "#F59E0B" // amber
        : score >= 30
        ? "#EF4444" // orange/red
        : "#DC2626" // dark red
      : colors.muted;

  return (
    <View style={styles.container}>
      {/* SVG Arc for Web (matches Canva website screenshot Page 4) */}
      {Platform.OS === "web" ? (
        <View style={styles.gaugeWrapper}>
          <svg width={190} height={105} viewBox="0 0 190 105" style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="riskGaugeGrad" x1="0%" y1="100%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EF4444" />
                <stop offset="35%" stopColor="#F97316" />
                <stop offset="60%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#22C55E" />
              </linearGradient>
            </defs>
            <path
              d="M 22 95 A 73 73 0 0 1 168 95"
              fill="none"
              stroke="url(#riskGaugeGrad)"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </svg>
          <View style={styles.centerTextOverlay}>
            <Text style={[styles.scoreText, { color: tierColor }]}>{displayScore}</Text>
            <Text style={[styles.tierText, { color: tierColor }]}>{displayLabel}</Text>
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

      {/* Scale markers (exact labels from Canva website screenshot) */}
      <View style={styles.scaleRow}>
        <Text style={styles.scaleItem}>0 High</Text>
        <Text style={styles.scaleItem}>40 Moderate</Text>
        <Text style={styles.scaleItem}>70 Low</Text>
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
    maxWidth: 196,
    marginTop: 10,
    paddingHorizontal: 4,
  },
  scaleItem: {
    fontSize: 10,
    color: "#8FA3BF",
    fontWeight: "600",
  },
});
