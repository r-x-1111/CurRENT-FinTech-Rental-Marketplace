import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../../constants/theme';
import { rentals } from '../../data/mock';

export default function RentalsScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={rentals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>My rentals</Text>
            <Text style={styles.caption}>Requests, upcoming rentals and active returns in one place.</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.itemTitle}>{item.listingTitle}</Text>
              <Text style={styles.status}>{item.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>{item.startDate} to {item.endDate}</Text>
            <Text style={styles.amount}>RM{item.amount.toFixed(2)}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  content: { padding: spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  caption: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  itemTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  status: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  meta: { color: colors.muted, marginTop: spacing.sm },
  amount: { color: colors.navy, fontWeight: '800', marginTop: spacing.sm }
});
