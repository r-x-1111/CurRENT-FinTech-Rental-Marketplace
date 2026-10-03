import { router } from 'expo-router';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ListingCard } from '../../components/ListingCard';
import { colors, radius, spacing } from '../../constants/theme';
import { listings } from '../../data/mock';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.hero}>
              <Text style={styles.brand}>CurRENT</Text>
              <Text style={styles.headline}>Rent what you need. Earn from what you own.</Text>
              <Text style={styles.subhead}>Safer peer-to-peer rentals with verified users, secure payments and smarter protection.</Text>
              <TextInput placeholder="What do you want to rent?" placeholderTextColor={colors.muted} style={styles.search} />
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Popular near you</Text>
                <Text style={styles.sectionCaption}>Klang Valley</Text>
              </View>
              <Pressable onPress={() => router.push('/(tabs)/explore')}>
                <Text style={styles.link}>Explore all</Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <ListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.offWhite },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg },
  brand: { color: colors.softBlue, fontSize: 16, fontWeight: '800', marginBottom: spacing.sm },
  headline: { color: colors.white, fontSize: 29, lineHeight: 34, fontWeight: '800' },
  subhead: { color: '#D0D5DD', lineHeight: 20, marginTop: spacing.sm },
  search: { marginTop: spacing.lg, backgroundColor: colors.white, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 50, color: colors.text },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  sectionCaption: { color: colors.muted, marginTop: 2 },
  link: { color: colors.blue, fontWeight: '700' }
});
