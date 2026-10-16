import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListingGrid } from "../../components/ListingGrid";
import { Empty } from "../../components/ui";
import { colors } from "../../constants/theme";
import { MAIN_CATEGORIES, locations, matchesMarketplaceLocation } from "../../constants/categories";
import { useMarketplace } from "../../context/Marketplace";
import { GuestAuthPrompt } from "../../components/GuestAuth";

export default function HomeScreen() {
  const { state, user } = useMarketplace();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;
  const isMobile = width < 768;
  const unreadNotifications = state.notifications.filter(
    (notice) => notice.userId === user?.id && !notice.read,
  ).length;

  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    saved?: string;
    location?: string;
  }>();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [selectedCategory, setSelectedCategory] = useState(params.category === "All Items" ? "All items" : params.category || "All items");
  const [selectedLocation, setSelectedLocation] = useState(params.location === "All Klang Valley" ? "All Malaysia" : params.location || "All Malaysia");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const categoryMenuAnimation = useRef(new Animated.Value(0)).current;
  const [savedOnly, setSavedOnly] = useState(params.saved === "1");
  const [authPrompt, setAuthPrompt] = useState(false);

  useEffect(() => {
    if (params.q !== undefined) setSearchQuery(params.q);
    if (params.category !== undefined) {
      setSelectedCategory(params.category === "All Items" ? "All items" : params.category);
    }
    if (params.saved !== undefined) setSavedOnly(params.saved === "1");
    if (params.location !== undefined) setSelectedLocation(params.location === "All Klang Valley" ? "All Malaysia" : params.location || "All Malaysia");
  }, [params.q, params.category, params.saved, params.location]);

  useEffect(() => {
    Animated.timing(categoryMenuAnimation, {
      toValue: showCategoryMenu ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [categoryMenuAnimation, showCategoryMenu]);

  function handleClearFilters() {
    setSearchQuery("");
    setSelectedCategory("All items");
    setShowCategoryMenu(false);
    setSelectedLocation("All Malaysia");
    setSavedOnly(false);
  }

  // Filter listings based on search, category, location, and saved-only
  const filteredListings = state.listings
    .filter((l) => {
      if (l.status !== "published") return false;
      if (selectedCategory !== "All items" && l.category !== selectedCategory) return false;
      if (savedOnly && !user?.favourites.includes(l.id)) return false;
      if (
        !matchesMarketplaceLocation(l.location, selectedLocation)
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matches = [l.title, l.description, l.category, l.location]
          .join(" ")
          .toLowerCase()
          .includes(q);
        if (!matches) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const now = Date.now();
      const aBoosted = a.featuredUntil && new Date(a.featuredUntil).getTime() > now ? 1 : 0;
      const bBoosted = b.featuredUntil && new Date(b.featuredUntil).getTime() > now ? 1 : 0;
      return bBoosted - aBoosted;
    });

  const hasFilter =
    searchQuery.trim() !== "" ||
    selectedCategory !== "All items" ||
    selectedLocation !== "All Malaysia" ||
    savedOnly;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <GuestAuthPrompt visible={authPrompt} onClose={() => setAuthPrompt(false)} returnTo="/(tabs)" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* =========================================================================
            1. HERO SECTION (Canva Page 2 Dark Navy Anchor)
           ========================================================================= */}
        <View style={[styles.heroWrapper, isMobile && styles.mobileHeroWrapper]}>
          <View style={styles.heroContainer}>
            <View
              style={[
                styles.heroContent,
                isMobile && styles.mobileHeroContent,
                { width: isDesktop ? "62%" : "100%" },
              ]}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.eyebrowBadge}>
                  <Text style={styles.eyebrowText}>RENTALS ACROSS MALAYSIA</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    unreadNotifications > 0
                      ? `Notifications, ${unreadNotifications} unread`
                      : "Notifications"
                  }
                  onPress={() => user ? router.push("/notifications") : setAuthPrompt(true)}
                  style={styles.notificationButton}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={21}
                    color={colors.navy}
                  />
                  {unreadNotifications > 0 && (
                    <View style={styles.notificationCount}>
                      <Text style={styles.notificationCountText}>
                        {unreadNotifications > 9 ? "9+" : unreadNotifications}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Main Headline */}
              <Text style={[styles.heroHeadline, isMobile && styles.mobileHeroHeadline]}>
                Rent what you need.{"\n"}Earn from what you own.
              </Text>

              {/* Subtitle */}
              <Text style={[styles.heroSubhead, isMobile && styles.mobileHeroSubhead]}>
                Useful things, nearby. Discover trusted rentals across Malaysia
                or turn your idle gear into extra income.
              </Text>

              {/* Search Bar Container */}
              <View style={[styles.searchContainer, isMobile && styles.mobileSearchContainer]}>
                <View style={styles.searchInputRow}>
                  <Ionicons name="search-outline" size={19} color={colors.muted} />
                  <TextInput
                    accessibilityLabel="Search items"
                    placeholder="Search cameras, tools, speakers..."
                    placeholderTextColor="#8FA3BF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    style={styles.searchInput}
                  />
                  {searchQuery.trim() !== "" && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setSearchQuery("")}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.muted} />
                    </Pressable>
                  )}
                </View>

                <View style={isMobile ? styles.mobileSearchActions : styles.desktopSearchActions}>
                {/* Location selector toggle */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowLocationPicker(!showLocationPicker)}
                  style={[styles.locationDropdownBtn, isMobile && styles.mobileLocationBtn]}
                >
                  <Ionicons name="location-outline" size={15} color={colors.navy} />
                  <Text style={styles.locationBtnText} numberOfLines={1}>
                    {selectedLocation}
                  </Text>
                  <Ionicons
                    name={showLocationPicker ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={colors.navy}
                  />
                </Pressable>

                {/* Search submit button */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Search marketplace"
                  onPress={() => router.setParams({ q: searchQuery.trim() })}
                  style={[styles.searchSubmitBtn, isMobile && styles.mobileSearchSubmitBtn]}
                >
                  <Ionicons name="search" size={18} color="white" />
                  {(isDesktop || isMobile) && <Text style={styles.searchSubmitText}>Search</Text>}
                </Pressable>
                </View>
              </View>

              {/* Location Picker dropdown items */}
              {showLocationPicker && (
                <ScrollView nestedScrollEnabled style={styles.locationDropdownList}>
                  {locations.map((loc) => (
                    <Pressable
                      key={loc}
                      accessibilityRole="button"
                      onPress={() => {
                        setSelectedLocation(loc);
                        setShowLocationPicker(false);
                      }}
                      style={[
                        styles.locationOption,
                        selectedLocation === loc && styles.locationOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.locationOptionText,
                          selectedLocation === loc && {
                            color: colors.blue,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {loc}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

                <View style={[styles.mobileCategorySection, !isMobile && styles.desktopCategorySection]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose category"
                    accessibilityState={{ expanded: showCategoryMenu }}
                    onPress={() => setShowCategoryMenu((open) => !open)}
                    style={styles.mobileCategoryButton}
                  >
                    <Text style={styles.mobileCategoryButtonText}>
                      {selectedCategory === "All items" ? "All Items" : selectedCategory}
                    </Text>
                    <Ionicons name={showCategoryMenu ? "chevron-up" : "chevron-down"} size={17} color={colors.blue} />
                  </Pressable>
                  <Animated.View style={[styles.mobileCategoryMenu, {
                    height: categoryMenuAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 288] }),
                    opacity: categoryMenuAnimation,
                  }]}>
                    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
                      {["All items", ...MAIN_CATEGORIES].map((cat) => {
                        const selected = selectedCategory === cat;
                        return (
                          <Pressable
                            key={cat}
                            accessibilityRole="button"
                            accessibilityLabel={`Filter by ${cat === "All items" ? "All Items" : cat}`}
                            accessibilityState={{ selected }}
                            onPress={() => {
                              setSelectedCategory(cat);
                              setShowCategoryMenu(false);
                            }}
                            style={[styles.mobileCategoryOption, selected && styles.mobileCategoryOptionSelected]}
                          >
                            <Text style={[styles.mobileCategoryOptionText, selected && styles.mobileCategoryOptionTextSelected]}>
                              {cat === "All items" ? "All Items" : cat}
                            </Text>
                            {selected && <Ionicons name="checkmark" size={17} color={colors.blue} />}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </Animated.View>
                </View>
            </View>

            {/* Floating Sample Cards (Shown on Desktop, Canva Page 2) */}
            {isDesktop && (
              <View style={styles.heroShowcase}>
                <Pressable
                  onPress={() => router.push("/listing/sony-a7iii")}
                  style={[styles.floatingCard, styles.floatCard1]}
                >
                  <Image
                    source={{
                      uri: "/products/sony-a7iii.jpg",
                    }}
                    style={styles.floatImg}
                  />
                  <View style={styles.floatBody}>
                    <Text style={styles.floatTitle}>Sony A7 III</Text>
                    <Text style={styles.floatPrice}>RM45/day · PJ</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/listing/ps5-console")}
                  style={[styles.floatingCard, styles.floatCard2]}
                >
                  <Image
                    source={{
                      uri: "/products/ps5-console.jpg",
                    }}
                    style={styles.floatImg}
                  />
                  <View style={styles.floatBody}>
                    <Text style={styles.floatTitle}>PlayStation 5</Text>
                    <Text style={styles.floatPrice}>RM35/day · Subang</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/listing/portable-projector")}
                  style={[styles.floatingCard, styles.floatCard3]}
                >
                  <Image
                    source={{
                      uri: "/products/portable-projector.jpg",
                    }}
                    style={styles.floatImg}
                  />
                  <View style={styles.floatBody}>
                    <Text style={styles.floatTitle}>Portable Projector</Text>
                    <Text style={styles.floatPrice}>RM28/day · KL</Text>
                  </View>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* =========================================================================
            2. DISCOVERY CATALOGUE SECTION (Merged Explore Functionality)
           ========================================================================= */}
        <View style={[styles.catalogueSection, isMobile && styles.mobileCatalogueSection]}>
          <View style={[styles.catalogueControlsRow, isMobile && styles.mobileCatalogueControlsRow]}>
            {/* Left: Results count & active category indicator */}
            <View style={{ flex: 1 }}>
              <Text style={styles.resultsCount}>
                {(selectedCategory === "All items" || selectedCategory === "All Items")
                  ? "All Items"
                  : selectedCategory}{" "}
                <Text style={styles.resultsCountNum}>({filteredListings.length} available)</Text>
              </Text>
            </View>

            {/* Right: Saved Only toggle & Clear Filters */}
            <View style={styles.rightControls}>
              <View style={styles.savedToggleRow}>
                <Ionicons
                  name={savedOnly ? "heart" : "heart-outline"}
                  size={16}
                  color={savedOnly ? colors.danger : colors.navy}
                />
                <Text style={styles.savedLabel}>Saved only</Text>
                <Switch
                  accessibilityLabel="Saved items only"
                  value={savedOnly}
                  onValueChange={(value) => user ? setSavedOnly(value) : setAuthPrompt(true)}
                  trackColor={{ false: "#CBD5E1", true: colors.blue }}
                />
              </View>

              {hasFilter && (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleClearFilters}
                  style={styles.clearBtn}
                >
                  <Ionicons name="close-circle-outline" size={15} color={colors.muted} />
                  <Text style={styles.clearBtnText}>Reset</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Catalogue Grid */}
          {filteredListings.length > 0 ? (
            <ListingGrid listings={filteredListings} compactMobile />
          ) : (
            <Empty
              title="No matches found"
              text="Try adjusting your keyword, choosing a different category, or turning off the Saved only filter."
              action="Reset search & filters"
              onPress={handleClearFilters}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.offWhite,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  // Hero Styles
  heroWrapper: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 36,
  },
  mobileHeroWrapper: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 18 },
  heroContainer: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroContent: {
    gap: 16,
  },
  mobileHeroContent: { gap: 10 },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF3FF",
    position: "relative",
  },
  notificationCount: {
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: colors.danger,
    position: "absolute",
    right: -2,
    top: -2,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationCountText: {
    color: "white",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  eyebrowBadge: {
    backgroundColor: colors.navy,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  eyebrowText: {
    color: "#99C0FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  heroHeadline: {
    color: "white",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1.2,
    lineHeight: 46,
  },
  mobileHeroHeadline: { fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  heroSubhead: {
    color: "#C5D2E2",
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 520,
  },
  mobileHeroSubhead: { fontSize: 13, lineHeight: 19 },
  searchContainer: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  mobileSearchContainer: { flexDirection: "column", alignItems: "stretch", gap: 5, marginTop: 2, padding: 7 },
  desktopSearchActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  mobileSearchActions: { flexDirection: "row", alignItems: "stretch", gap: 7 },
  searchInputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.navy,
    paddingVertical: 8,
  },
  locationDropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.paleBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 140,
  },
  mobileLocationBtn: { flex: 1, maxWidth: undefined, minHeight: 42 },
  locationBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },
  searchSubmitBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mobileSearchSubmitBtn: { minHeight: 42, justifyContent: "center", paddingHorizontal: 18 },
  searchSubmitText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  locationDropdownList: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginTop: -8,
    maxHeight: 260,
  },
  locationOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  locationOptionSelected: {
    backgroundColor: colors.paleBlue,
  },
  locationOptionText: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: "500",
  },
  mobileCategorySection: { marginTop: 2, gap: 5 },
  desktopCategorySection: { width: 280, marginTop: 8 },
  mobileCategoryButton: {
    minHeight: 43,
    paddingHorizontal: 14,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    shadowColor: colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
  },
  mobileCategoryButtonText: { color: colors.navy, fontSize: 13, fontWeight: "700" },
  mobileCategoryMenu: {
    overflow: "hidden",
    borderRadius: 11,
    backgroundColor: colors.white,
    borderColor: colors.border,
    shadowColor: colors.navy,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mobileCategoryOption: {
    minHeight: 40,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mobileCategoryOptionSelected: { backgroundColor: colors.paleBlue },
  mobileCategoryOptionText: { color: colors.navy, fontSize: 13 },
  mobileCategoryOptionTextSelected: { color: colors.blue, fontWeight: "700" },
  // Floating Hero Showcase
  heroShowcase: {
    width: "35%",
    height: 380,
    position: "relative",
  },
  floatingCard: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    width: 175,
  },
  floatCard1: {
    top: 15,
    left: 20,
    transform: [{ rotate: "-4deg" }],
  },
  floatCard2: {
    top: 80,
    right: 10,
    transform: [{ rotate: "3deg" }],
  },
  floatCard3: {
    bottom: 25,
    left: 45,
    transform: [{ rotate: "-2deg" }],
  },
  floatImg: {
    width: "100%",
    height: 100,
  },
  floatBody: {
    padding: 8,
    gap: 2,
  },
  floatTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.navy,
  },
  floatPrice: {
    fontSize: 11,
    color: colors.blue,
    fontWeight: "600",
  },
  // Catalogue section
  catalogueSection: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  mobileCatalogueSection: { paddingHorizontal: 16, paddingTop: 15, gap: 12 },
  catalogueControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: "wrap",
    gap: 12,
  },
  mobileCatalogueControlsRow: { gap: 7, paddingBottom: 7 },
  resultsCount: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.navy,
  },
  resultsCountNum: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.muted,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  savedToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  savedLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navy,
  },
  trustBanner: {
    backgroundColor: colors.paleBlue,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.softBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trustBannerText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.paleBlue,
    borderWidth: 1,
    borderColor: colors.softBlue,
  },
  clearBtnText: {
    fontSize: 12,
    color: colors.blue,
    fontWeight: "600",
  },
});
