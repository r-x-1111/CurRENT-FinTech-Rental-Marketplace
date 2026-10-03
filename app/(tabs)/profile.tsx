import { router } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { calculateRiskScore } from '../../services/riskScore';

export default function ProfileScreen() {
  const risk = calculateRiskScore({
    verified: true,
    completedRentals: 8,
    averageRating: 4.9,
    lateReturns: 0,
    resolvedDisputes: 0,
    unresolvedSeriousDisputes: 0
  });

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>R</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>CurRENT User</Text>
            <Text style={styles.verified}>✓ Identity verified</Text>
          </View>
        </View>

        <View style={styles.riskCard}>
          <Text style={styles.label}>Rental Risk Score</Text>
          <Text style={styles.score}>{risk.score} / 100</Text>
          <Text style={styles.riskLevel}>{risk.level === 'low' ? 'Low Risk' : risk.level === 'standard' ? 'Standard Risk' : 'Higher Risk'}</Text>
          <Text style={styles.help}>Based on verification, rental history and transaction behaviour.</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={() => router.push('/owner')}>
          <Text style={styles.primaryButtonText}>Switch to Owner Mode</Text>
        </Pressable>

        {['Reviews & ratings', 'Payment methods', 'Transaction history', 'Verification', 'Help & support', 'Settings'].map((item) => (
          <View key={item} style={styles.menuRow}><Text style={styles.menuText}>{item}</Text><Text style={styles.chevron}>›</Text></View>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  content: { padding: spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.softBlue, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  avatarText: { fontSize: 20, fontWeight: '800', color: colors.navy },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  verified: { color: colors.green, marginTop: 4, fontWeight: '600' },
  riskCard: { backgroundColor: colors.paleBlue, borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.md },
  label: { color: colors.navy, fontWeight: '700' },
  score: { color: colors.navy, fontSize: 34, fontWeight: '900', marginTop: spacing.xs },
  riskLevel: { color: colors.green, fontWeight: '800' },
  help: { color: colors.muted, marginTop: spacing.sm, lineHeight: 19 },
  primaryButton: { backgroundColor: colors.blue, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginVertical: spacing.lg },
  primaryButtonText: { color: colors.white, fontWeight: '800' },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuText: { color: colors.text, fontWeight: '600' },
  chevron: { color: colors.muted, fontSize: 20 }
});
