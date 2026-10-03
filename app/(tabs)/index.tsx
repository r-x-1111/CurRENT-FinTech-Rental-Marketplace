import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Screen, Section, s } from "../../components/ui";
import { ListingGrid } from "../../components/ListingGrid";
import { useMarketplace } from "../../context/Marketplace";
import { colors } from "../../constants/theme";
import { categories } from "../../constants/categories";
const categoryIcons = [
  "grid-outline",
  "camera-outline",
  "headset-outline",
  "game-controller-outline",
  "leaf-outline",
  "hammer-outline",
] as const;
export default function HomeScreen() {
  const { state, user } = useMarketplace();
  const [query, setQuery] = useState("");
  const { width } = useWindowDimensions();
  const unread = state.notifications.filter(
    (n) => n.userId === user?.id && !n.read,
  ).length;
  const active = state.bookings.filter(
    (b) =>
      b.renterId === user?.id &&
      ["active", "upcoming", "approved", "return_pending"].includes(b.status),
  );
  function search() {
    router.push({ pathname: "/(tabs)/explore", params: { q: query } });
  }
  return (
    <Screen>
      <View style={styles.top}>
        <View>
          <Text style={styles.brand}>
            Cur<Text style={{ color: colors.blue }}>RENT</Text>
            <Text style={styles.dot}> ●</Text>
          </Text>
          <Text style={styles.location}>
            <Ionicons name="location-outline" size={12} /> Klang Valley,
            Malaysia
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
          <Pressable
            accessibilityLabel="Notifications"
            accessibilityRole="button"
            onPress={() => router.push("/notifications")}
            style={styles.icon}
          >
            <Ionicons
              name="notifications-outline"
              size={21}
              color={colors.navy}
            />
            {unread > 0 && <View style={styles.unread} />}
          </Pressable>
          <Pressable
            accessibilityLabel="Your profile"
            onPress={() => router.push("/(tabs)/profile")}
            style={styles.avatar}
          >
            <Text style={s.bold}>
              {user?.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("") || "Hi"}
            </Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.hero}>
        <View
          style={[styles.heroCopy, { width: width >= 750 ? "59%" : "100%" }]}
        >
          <Text style={styles.eyebrow}>
            LESS OWNERSHIP. MORE POSSIBILITIES.
          </Text>
          <Text style={[styles.headline, { fontSize: width >= 750 ? 47 : 36 }]}>
            Big plans.{"\n"}Small commitment.
          </Text>
          <Text style={styles.subhead}>
            Rent what you need. Earn from what you own.{"\n"}Discover great
            things from people near you.
          </Text>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={21} color={colors.muted} />
            <TextInput
              accessibilityLabel="Search rentals"
              placeholder="What’s your next adventure?"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={search}
              returnKeyType="search"
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 14,
                color: colors.navy,
                paddingVertical: 13,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              onPress={search}
              style={styles.searchButton}
            >
              <Ionicons name="arrow-forward" color="white" size={20} />
            </Pressable>
          </View>
          <Text style={styles.heroNote}>
            Cameras, camping gear, consoles & a whole lot more
          </Text>
        </View>
        {width >= 750 && (
          <View style={styles.heroImage}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=900&q=85",
              }}
              style={{ position: "absolute", width: "100%", height: "100%" }}
              resizeMode="cover"
            />
            <View style={styles.imageLabel}>
              <Text style={{ color: "white", fontSize: 11, letterSpacing: 2 }}>
                MAKE THE WEEKEND YOURS
              </Text>
              <Text
                style={{
                  color: "white",
                  fontWeight: "700",
                  fontSize: 23,
                  marginTop: 8,
                }}
              >
                Stories worth capturing.
              </Text>
            </View>
          </View>
        )}
      </View>
      <View style={styles.trust}>
        {[
          ["shield-checkmark-outline", "Verified community"],
          ["card-outline", "Clear, upfront pricing"],
          ["sync-outline", "Rent. Return. Repeat."],
        ].map(([icon, label]) => (
          <View
            key={label}
            style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
          >
            <Ionicons
              name={icon as "shield-checkmark-outline"}
              size={18}
              color={colors.blue}
            />
            <Text style={styles.trustText}>{label}</Text>
          </View>
        ))}
      </View>
      {!!active.length && (
        <Pressable
          onPress={() => router.push("/(tabs)/rentals")}
          style={styles.reminder}
        >
          <Ionicons name="bag-handle-outline" size={22} color={colors.blue} />
          <Text style={[s.body, { flex: 1 }]}>
            {active.length} rental{active.length > 1 ? "s" : ""} to keep an eye
            on
          </Text>
          <Text style={s.link}>View rentals →</Text>
        </Pressable>
      )}
      <Section title="What are you planning?" />
      <View style={styles.categories}>
        {categories.map((category, i) => (
          <Pressable
            key={category}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/(tabs)/explore", params: { category } })
            }
            style={[styles.category, width < 650 && { flexBasis: "28%" }]}
          >
            <View style={styles.categoryIcon}>
              <Ionicons name={categoryIcons[i]} size={25} color={colors.navy} />
            </View>
            <Text style={styles.categoryText}>{category}</Text>
          </Pressable>
        ))}
      </View>
      <Section
        title="Good finds, close to home"
        action="Explore all →"
        onPress={() => router.push("/(tabs)/explore")}
      />
      <Text style={[s.caption, { marginTop: -10, marginBottom: 20 }]}>
        A little inspiration for whatever’s next.
      </Text>
      <ListingGrid
        listings={state.listings
          .filter((l) => l.status === "published")
          .slice(0, 6)}
      />
      <Pressable
        onPress={() => router.push("/owner")}
        style={styles.ownerBanner}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>Your spare gear. Your extra income.</Text>
          <Text style={s.caption}>Put the things you already own to work.</Text>
        </View>
        <Ionicons name="arrow-forward-circle" size={38} color={colors.blue} />
      </Pressable>
      <Text
        style={{
          color: colors.muted,
          fontSize: 11,
          textAlign: "center",
          marginTop: 25,
        }}
      >
        ACADEMIC PROTOTYPE · Simulated payments, protection and identity
        verification
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  brand: {
    fontSize: 27,
    fontWeight: "900",
    letterSpacing: -1.3,
    color: colors.navy,
  },
  dot: { color: colors.blue, fontSize: 13 },
  location: { color: colors.muted, fontSize: 11, marginTop: 4 },
  icon: { position: "relative", padding: 7 },
  unread: {
    width: 6,
    height: 6,
    backgroundColor: colors.blue,
    borderRadius: 4,
    position: "absolute",
    top: 6,
    right: 8,
  },
  avatar: {
    backgroundColor: colors.softBlue,
    width: 40,
    height: 40,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: 23,
    overflow: "hidden",
    flexDirection: "row",
  },
  heroCopy: { padding: 30, paddingVertical: 38 },
  eyebrow: {
    color: "#A7C7FF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  headline: {
    color: "white",
    letterSpacing: -1.5,
    fontWeight: "800",
    lineHeight: 53,
    marginTop: 17,
  },
  subhead: { color: "#C5D2E2", fontSize: 14, lineHeight: 23, marginTop: 16 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "white",
    borderRadius: 12,
    paddingLeft: 15,
    paddingRight: 6,
    marginTop: 26,
  },
  searchButton: { backgroundColor: colors.blue, padding: 11, borderRadius: 8 },
  heroNote: { color: "#9EADC3", fontSize: 10, marginTop: 12 },
  heroImage: { width: "41%", justifyContent: "flex-end" },
  imageLabel: { padding: 24, paddingTop: 60, backgroundColor: "#0B1F3A66" },
  trust: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    gap: 16,
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  trustText: { fontSize: 12, color: colors.muted },
  categories: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 15,
  },
  category: { alignItems: "center", gap: 10, minWidth: 75, flex: 1 },
  categoryIcon: {
    backgroundColor: "#EBEDF3",
    width: 62,
    height: 62,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryText: { color: colors.navy, fontSize: 12, fontWeight: "600" },
  reminder: {
    padding: 16,
    borderRadius: 13,
    backgroundColor: colors.softBlue,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  ownerBanner: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    padding: 24,
    backgroundColor: colors.softBlue,
    borderRadius: 18,
    marginTop: 32,
  },
});
