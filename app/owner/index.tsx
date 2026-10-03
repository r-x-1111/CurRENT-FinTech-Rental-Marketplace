import { router } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { calculateOwnerPayout } from '../../services/deposit';

export default function OwnerDashboardScreen() {
  const exampleRental = calculateOwnerPayout(200);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Renter mode</Text></Pressable>
        <Text style={styles.title}>Owner Dashboard</Text>
        <Text style={styles.caption}>Manage listings, rental requests and payouts.</Text>

        <View style={styles.statsRow}>
          <Stat label="Earnings" value="RM580" />
          <Stat label="Active listings" value="3" />
          <Stat label="Requests" value="2" />
        </View>

        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>+ Create Listing</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Rental requests</Text>
        <View style={styles.requestCard}>
          <View style={styles.requestHeader}>
            <View>
              <Text style={styles.itemTitle}>Sony A7 III Mirrorless Camera</Text>
              <Text style={styles.meta}>12–14 Oct 2026 · 2 days</Text>
            </View>
            <Text style={styles.verified}>✓ Verified</Text>
          </View>
          <View style={styles.riskBox}>
            <Text style={styles.riskTitle}>Renter Risk Score</Text>
            <Text style={styles.riskScore}>82 / 100 · Low Risk</Text>
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton}><Text style={styles.secondaryText}>Reject</Text></Pressable>
            <Pressable style={styles.approveButton}><Text style={styles.approveText}>Approve</Text></Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Example payout</Text>
        <View style={styles.payoutCard}>
          <PayoutRow label="Gross rental income" value="RM200.00" />
          <PayoutRow label="CurRENT commission (12%)" value={`RM${exampleRental.commission.toFixed(2)}`} />
          <View style={styles.divider} />
          <PayoutRow label="Estimated owner payout" value={`RM${exampleRental.payout.toFixed(2)}`} strong />
        </View>

        <Text style={styles.sectionTitle}>Owner tools</Text>
        {['My listings', 'Rental requests', 'Active rentals', 'Earnings & payouts', 'Messages', 'Reviews'].map((item) => (
          <View key={item} style={styles.menuRow}>
            <Text style={styles.menuText}>{item}</Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PayoutRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.payoutRow}>
      <Text style={[styles.payoutText, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.payoutText, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  back: { color: colors.blue, fontWeight: '700', marginBottom: spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  caption: { color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, backgroundColor: colors.navy, borderRadius: radius.md, padding: spacing.md },
  statValue: { color: colors.white, fontSize: 20, fontWeight: '900' },
  statLabel: { color: colors.softBlue, marginTop: 4, fontSize: 12 },
  primaryButton: { backgroundColor: colors.blue, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginVertical: spacing.lg },
  primaryButtonText: { color: colors.white, fontWeight: '800' },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
  requestCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  requestHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  itemTitle: { color: colors.text, fontWeight: '800', maxWidth: 235 },
  meta: { color: colors.muted, marginTop: 4 },
  verified: { color: colors.green, fontWeight: '700' },
  riskBox: { backgroundColor: colors.paleBlue, borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.md },
  riskTitle: { color: colors.muted, fontSize: 12 },
  riskScore: { color: colors.navy, fontWeight: '900', fontSize: 18, marginTop: 3 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  secondaryText: { color: colors.text, fontWeight: '700' },
  approveButton: { flex: 1, backgroundColor: colors.blue, padding: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  approveText: { color: colors.white, fontWeight: '800' },
  payoutCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  payoutRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  payoutText: { color: colors.text },
  strong: { fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuText: { color: colors.text, fontWeight: '600' },
  chevron: { color: colors.muted, fontSize: 20 }
});
