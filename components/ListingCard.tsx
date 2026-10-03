import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Listing } from '../types';
import { colors, radius, spacing } from '../constants/theme';

interface Props {
  listing: Listing;
  onPress: () => void;
}

export function ListingCard({ listing, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={{ uri: listing.imageUrl }} style={styles.image} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
        <Text style={styles.meta}>{listing.location} · ★ {listing.rating.toFixed(1)}</Text>
        {listing.verifiedOwner ? <Text style={styles.verified}>✓ Verified owner</Text> : null}
        <View style={styles.footer}>
          <Text style={styles.price}>RM{listing.dailyPrice}/day</Text>
          <Text style={styles.link}>View item</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.md
  },
  image: { width: '100%', height: 185, backgroundColor: colors.lightGrey },
  body: { padding: spacing.md, gap: spacing.xs },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { color: colors.muted },
  verified: { color: colors.green, fontWeight: '600' },
  footer: { marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { color: colors.navy, fontSize: 17, fontWeight: '800' },
  link: { color: colors.blue, fontWeight: '700' }
});
