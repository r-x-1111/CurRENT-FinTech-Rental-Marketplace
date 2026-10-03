import { useMemo, useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ListingCard } from '../../components/ListingCard';
import { colors, radius, spacing } from '../../constants/theme';
import { listings } from '../../data/mock';

export default function ExploreScreen() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter((item) =>
      [item.title, item.category, item.location].some((value) => value.toLowerCase().includes(q))
    );
  }, [query]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Explore rentals</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search cameras, gaming, tools..."
          placeholderTextColor={colors.muted}
          style={styles.search}
        />
        <Text style={styles.filters}>Category · Location · Price · Availability · Verified owner</Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No matching items found.</Text>}
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  header: { padding: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  search: { height: 50, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text },
  filters: { color: colors.blue, marginTop: spacing.sm, fontWeight: '600' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  empty: { color: colors.muted, textAlign: 'center', marginTop: spacing.xl }
});
