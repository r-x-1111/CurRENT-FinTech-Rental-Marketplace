import { StyleSheet, Text, View } from "react-native";
import { Badge, Card, Notice, Row, Screen, s } from "../components/ui";
import { useMarketplace } from "../context/Marketplace";
import { colors } from "../constants/theme";

export default function RiskScoreHistoryScreen() {
  const { user } = useMarketplace();
  return <Screen back title="Risk Score History" subtitle="View past score updates and incidents">
    {!user ? <Notice text="Sign in to view your risk score history." /> : <Card style={styles.card}>

        <Text style={s.caption}>
          Single Winning Incident Rule: When multiple violations occur on the
          same physical rental chain, only the single most serious penalty is
          applied. Secondary incidents are recorded in audit history but not
          stacked.
        </Text>
        {user.riskHistory && user.riskHistory.length > 0 ? (
          user.riskHistory.map((item) => (
            <View
              key={item.id}
              style={{
                backgroundColor: colors.paleBlue,
                borderWidth: 1,
                borderColor: colors.softBlue,
                padding: 12,
                borderRadius: 10,
                marginTop: 8,
                gap: 4,
              }}
            >
              <View style={s.row}>
                <Text style={s.bold}>{item.itemTitle}</Text>
                <Text style={s.caption}>{item.date}</Text>
              </View>
              {item.incidents.map((inc, i) => (
                <View key={i} style={s.row}>
                  <Text style={[s.caption, { color: colors.navy }]}>
                    • {inc.description}
                  </Text>
                  <Badge
                    text={
                      inc.isWinning
                        ? `${inc.penalty >= 0 ? "+" : ""}${inc.penalty} (Applied)`
                        : "Recorded"
                    }
                    green={inc.isWinning && inc.penalty > 0}
                  />
                </View>
              ))}
              <Row
                label="Score impact"
                value={`${item.scoreBefore} → ${item.scoreAfter} (${item.effectiveAdjustment >= 0 ? "+" : ""}${item.effectiveAdjustment})`}
                strong
              />
            </View>
          ))
        ) : (
          <Text style={[s.caption, { marginVertical: 8 }]}>
            No incident records. Clean rental history established with initial
            verified score of 80.
          </Text>
        )}
    </Card>}
  </Screen>;
}

const styles = StyleSheet.create({
  card: { gap: 12, backgroundColor: colors.paleBlue, borderColor: colors.softBlue, borderTopWidth: 3, borderTopColor: colors.blue },
});
