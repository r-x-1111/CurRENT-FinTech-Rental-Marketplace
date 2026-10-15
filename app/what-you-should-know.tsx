import { StyleSheet, Text } from "react-native";
import { Card, Screen } from "../components/ui";
import { colors } from "../constants/theme";

export default function WhatYouShouldKnowScreen() {
  return <Screen back title="What You Should Know" subtitle="Deposit rules and score changes">
    <Card style={styles.card}>

          <Text style={styles.rulesSubheading}>Deposit & Booking Rules</Text>
          <Text style={styles.rulesBullet}>
            • Low Risk (80–100): 5% deposit, capped at RM500 (Direct checkout)
          </Text>
          <Text style={styles.rulesBullet}>
            • Medium Risk (40–79): 10% deposit, capped at RM1,000 (Direct
            checkout)
          </Text>
          <Text style={styles.rulesBullet}>
            • High Risk (30–39): 15% deposit, capped at RM1,500 (Direct
            checkout)
          </Text>
          <Text style={styles.rulesBullet}>
            • Very High Risk (0–29): CurRENT Platform Review request (Pending
            only, no checkout)
          </Text>
          <Text style={styles.rulesSubheading}>How Your Score Changes</Text>
          <Text style={styles.rulesBullet}>
            • +2 points: Complete a rental on time with no issues.
          </Text>
          <Text style={styles.rulesBullet}>
            • −5 points: Confirmed late return
          </Text>
          <Text style={styles.rulesBullet}>
            • −10 points: Confirmed minor damage.
          </Text>
          <Text style={styles.rulesBullet}>
            • −30 points: Confirmed serious damage or accidental loss.
          </Text>
          <Text style={styles.rulesBullet}>
            • Confirmed intentional theft or fraud: Permanent ban, not an
            additional numerical penalty.
          </Text>
          <Text style={styles.rulesNote}>
            Only one final outcome applies per rental. If multiple issues occur,
            the most serious confirmed outcome applies; pending reports do not
            change your score. Successful appeals correct the original outcome.
          </Text>
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  card: { gap: 8, backgroundColor: colors.paleBlue, borderColor: colors.softBlue, borderTopWidth: 3, borderTopColor: colors.blue },
  rulesSubheading: { fontSize: 16, fontWeight: "800", color: colors.navy, marginTop: 8 },
  rulesBullet: { fontSize: 14, lineHeight: 22, color: colors.slate },
  rulesNote: { fontSize: 13, lineHeight: 20, color: colors.slate, fontStyle: "italic", marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.softBlue },
});
