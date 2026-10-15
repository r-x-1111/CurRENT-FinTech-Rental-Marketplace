import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Notice, Row, Screen, s } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { colors } from "../constants/theme";

export default function RentalRiskScoreScreen() {
  const { user } = useMarketplace();
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  return (
    <Screen back title="Rental Risk Score" subtitle="Deposit rules, score changes and your history">
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="What You Should Know"
          accessibilityState={{ expanded: rulesExpanded }}
          onPress={() => setRulesExpanded((expanded) => !expanded)}
          style={({ hovered, pressed }) => [styles.header, hovered && styles.hovered, pressed && styles.pressed]}
        >
          <View style={styles.icon}><Ionicons name="information-circle-outline" size={18} color={colors.blue} /></View>
          <View style={styles.headerText}><Text style={styles.title}>What You Should Know</Text><Text style={styles.subtitle}>Deposit rules and score changes</Text></View>
          <Ionicons name={rulesExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.blue} />
        </Pressable>
        {rulesExpanded && <View style={styles.content}>
          <Text style={styles.subheading}>Deposit & Booking Rules</Text>
          <Text style={styles.bullet}>• Low Risk (80–100): 5% deposit, capped at RM500 (Direct checkout)</Text>
          <Text style={styles.bullet}>• Medium Risk (40–79): 10% deposit, capped at RM1,000 (Direct checkout)</Text>
          <Text style={styles.bullet}>• High Risk (30–39): 15% deposit, capped at RM1,500 (Direct checkout)</Text>
          <Text style={styles.bullet}>• Very High Risk (0–29): CurRENT Platform Review request (Pending only, no checkout)</Text>
          <Text style={styles.subheading}>How Your Score Changes</Text>
          <Text style={styles.bullet}>• +2 points: Complete a rental on time with no issues.</Text>
          <Text style={styles.bullet}>• −5 points: Confirmed late return</Text>
          <Text style={styles.bullet}>• −10 points: Confirmed minor damage.</Text>
          <Text style={styles.bullet}>• −30 points: Confirmed serious damage or accidental loss.</Text>
          <Text style={styles.bullet}>• Confirmed intentional theft or fraud: Permanent ban, not an additional numerical penalty.</Text>
          <Text style={styles.note}>Only one final outcome applies per rental. If multiple issues occur, the most serious confirmed outcome applies; pending reports do not change your score. Successful appeals correct the original outcome.</Text>
        </View>}
      </View>

      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Risk Score History"
          accessibilityState={{ expanded: historyExpanded }}
          onPress={() => setHistoryExpanded((expanded) => !expanded)}
          style={({ hovered, pressed }) => [styles.header, hovered && styles.hovered, pressed && styles.pressed]}
        >
          <View style={styles.icon}><Ionicons name="time-outline" size={18} color={colors.blue} /></View>
          <View style={styles.headerText}><Text style={styles.title}>Risk Score History</Text><Text style={styles.subtitle}>View past score updates and incidents</Text></View>
          <Ionicons name={historyExpanded ? "chevron-up" : "chevron-down"} size={18} color={colors.blue} />
        </Pressable>
        {historyExpanded && <View style={styles.content}>
          {!user ? <Notice text="Sign in to view your risk score history." /> : <>
            <Text style={s.caption}>Single Winning Incident Rule: When multiple violations occur on the same physical rental chain, only the single most serious penalty is applied. Secondary incidents are recorded in audit history but not stacked.</Text>
            {user.riskHistory && user.riskHistory.length > 0 ? user.riskHistory.map((item) => (
              <View key={item.id} style={styles.historyEntry}>
                <View style={s.row}><Text style={s.bold}>{item.itemTitle}</Text><Text style={s.caption}>{item.date}</Text></View>
                {item.incidents.map((inc, index) => (
                  <View key={index} style={s.row}>
                    <Text style={[s.caption, styles.incidentText]}>• {inc.description}</Text>
                    <Badge text={inc.isWinning ? `${inc.penalty >= 0 ? "+" : ""}${inc.penalty} (Applied)` : "Recorded"} green={inc.isWinning && inc.penalty > 0} />
                  </View>
                ))}
                <Row label="Score impact" value={`${item.scoreBefore} → ${item.scoreAfter} (${item.effectiveAdjustment >= 0 ? "+" : ""}${item.effectiveAdjustment})`} strong />
              </View>
            )) : <Text style={s.caption}>No incident records. Clean rental history established with initial verified score of 80.</Text>}
          </>}
        </View>}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.softBlue, borderRadius: 12, overflow: "hidden", marginBottom: 12 },
  header: { minHeight: 54, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.paleBlue, cursor: "pointer" },
  hovered: { backgroundColor: colors.softBlue },
  pressed: { opacity: 0.82 },
  icon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.softBlue, alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  title: { color: colors.navy, fontSize: 15, fontWeight: "800" },
  subtitle: { color: colors.slate, fontSize: 12, marginTop: 2 },
  content: { padding: 16, gap: 6, borderTopWidth: 1, borderTopColor: colors.border },
  subheading: { color: colors.navy, fontSize: 14, fontWeight: "800", marginTop: 6 },
  bullet: { color: colors.slate, fontSize: 13, lineHeight: 19 },
  note: { color: colors.slate, fontSize: 12, lineHeight: 18, fontStyle: "italic", borderTopWidth: 1, borderTopColor: colors.softBlue, paddingTop: 8, marginTop: 6 },
  historyEntry: { backgroundColor: colors.paleBlue, borderWidth: 1, borderColor: colors.softBlue, borderRadius: 10, padding: 12, gap: 4, marginTop: 8 },
  incidentText: { color: colors.navy, flex: 1 },
});
