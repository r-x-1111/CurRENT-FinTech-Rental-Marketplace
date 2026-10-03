import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { listings } from '../../data/mock';
import { calculateBorrowerServiceFee, calculateSecurityDeposit } from '../../services/deposit';
import { calculateRiskScore } from '../../services/riskScore';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listing = listings.find((item) => item.id === id) ?? listings[0];

  const risk = calculateRiskScore({
    verified: true,
    completedRentals: 8,
    averageRating: 4.9,
    lateReturns: 0,
    resolvedDisputes: 0,
    unresolvedSeriousDisputes: 0
  });
  const exampleDays = 2;
  const rentalFee = listing.dailyPrice * exampleDays;
  const serviceFee = calculateBorrowerServiceFee(rentalFee);
  const deposit = calculateSecurityDeposit(listing.estimatedValue, risk.level);
  const protection = 5;
  const total = rentalFee + serviceFee + deposit + protection;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
        <Image source={{ uri: listing.imageUrl }} style={styles.image} />
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.meta}>{listing.location} · ★ {listing.rating.toFixed(1)} · ✓ Verified owner</Text>
        <Text style={styles.price}>RM{listing.dailyPrice}/day</Text>
        <Text style={styles.description}>{listing.description}</Text>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Example 2-day booking</Text>
          <Row label="Rental fee" value={`RM${rentalFee.toFixed(2)}`} />
          <Row label="CurRENT service fee" value={`RM${serviceFee.toFixed(2)}`} />
          <Row label="Refundable security deposit" value={`RM${deposit.toFixed(2)}`} />
          <Row label="Item protection" value={`RM${protection.toFixed(2)}`} />
          <View style={styles.divider} />
          <Row label="Total payable" value={`RM${total.toFixed(2)}`} strong />
          <Text style={styles.note}>Deposit may vary based on verification, rental history and item value.</Text>
        </View>

        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Request to rent</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowText, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.rowText, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  back: { color: colors.blue, fontWeight: '700', marginBottom: spacing.md },
  image: { width: '100%', height: 300, borderRadius: radius.lg, backgroundColor: colors.lightGrey },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  meta: { color: colors.muted, marginTop: spacing.xs },
  price: { color: colors.navy, fontSize: 22, fontWeight: '900', marginTop: spacing.md },
  description: { color: colors.text, lineHeight: 21, marginTop: spacing.sm },
  panel: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  panelTitle: { color: colors.text, fontWeight: '800', fontSize: 18, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: spacing.md },
  rowText: { color: colors.text },
  strong: { fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  note: { color: colors.muted, marginTop: spacing.sm, lineHeight: 18, fontSize: 12 },
  button: { backgroundColor: colors.blue, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  buttonText: { color: colors.white, fontWeight: '800', fontSize: 16 }
});
