import React, { useEffect, useState } from "react";
import {
  Image,
  Platform,
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
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ListingGrid } from "../../components/ListingGrid";
import { Empty } from "../../components/ui";
import { colors } from "../../constants/theme";
import { MOBILE_BROWSE_CATEGORIES, MobileBrowseCategory, locations, matchesMarketplaceLocation, mobileBrowseCategoryFor, mobileBrowseCategoryForParam } from "../../constants/categories";
import { useMarketplace } from "../../context/Marketplace";
import { GuestAuthPrompt } from "../../components/GuestAuth";
import { MagneticGlow } from "../../components/MagneticGlow";

// Cools the hero photo's beige tones towards the page's blue palette. `filter` is a web-only
// CSS property (this app ships as a web build via react-native-web) so it's injected only on
// web and is a no-op on native platforms.
const webHeroImageCoolStyle = Platform.OS === "web" ? ({ filter: "saturate(0.85) hue-rotate(6deg)" } as any) : undefined;

// Hides the category-chip scrollbar while keeping it scrollable. `scrollbarWidth` covers
// Firefox; the injected `.hide-scrollbar::-webkit-scrollbar` rule below covers Chrome/Safari.
const webHideScrollbarStyle = Platform.OS === "web" ? ({ scrollbarWidth: "none", className: "hide-scrollbar" } as any) : undefined;
let scrollbarStyleInjected = false;
function injectHideScrollbarStyleOnce() {
  if (Platform.OS !== "web" || scrollbarStyleInjected || typeof document === "undefined") return;
  scrollbarStyleInjected = true;
  const style = document.createElement("style");
  style.textContent = ".hide-scrollbar::-webkit-scrollbar { display: none; }";
  document.head.appendChild(style);
}

export default function HomeScreen() {
  useEffect(() => { injectHideScrollbarStyleOnce(); }, []);
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
  const [mobileCategory, setMobileCategory] = useState<MobileBrowseCategory>(mobileBrowseCategoryForParam(params.category));
  const [selectedLocation, setSelectedLocation] = useState(params.location === "All Klang Valley" ? "All Malaysia" : params.location || "All Malaysia");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [savedOnly, setSavedOnly] = useState(params.saved === "1");
  const [authPrompt, setAuthPrompt] = useState(false);

  useEffect(() => {
    if (params.q !== undefined) setSearchQuery(params.q);
    if (params.category !== undefined) {
      setMobileCategory(mobileBrowseCategoryForParam(params.category));
    }
    if (params.saved !== undefined) setSavedOnly(params.saved === "1");
    if (params.location !== undefined) setSelectedLocation(params.location === "All Klang Valley" ? "All Malaysia" : params.location || "All Malaysia");
  }, [params.q, params.category, params.saved, params.location]);

  function handleClearFilters() {
    setSearchQuery("");
    setMobileCategory("All Categories");
    setSelectedLocation("All Malaysia");
    setSavedOnly(false);
  }

  // Filter listings based on search, category, location, and saved-only
  const filteredListings = state.listings
    .filter((l) => {
      if (l.status !== "published") return false;
      if (mobileCategory !== "All Categories" && mobileBrowseCategoryFor(l) !== mobileCategory) return false;
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
    mobileCategory !== "All Categories" ||
    selectedLocation !== "All Malaysia" ||
    savedOnly;

  // Hide any category chip that has no published listings tagged with it.
  const publishedListings = state.listings.filter((l) => l.status === "published");
  const visibleCategories = MOBILE_BROWSE_CATEGORIES.filter(
    (category) =>
      category === "All Categories" ||
      publishedListings.some((l) => mobileBrowseCategoryFor(l) === category),
  );

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
        <View
          style={[styles.heroWrapper, isDesktop && styles.desktopHeroWrapper, isDesktop && { paddingLeft: width >= 1600 ? "22%" : "20%" }, isMobile && styles.mobileHeroWrapper]}
        >
          {/* Full-bleed hero background photo. Its own composition already keeps ~55% of its
              left side as clean navy studio background and groups the camera/MacBook/DualSense/
              projector/plant within the right ~45% — so used edge-to-edge at the hero's own
              aspect ratio, that same balanced split carries straight through onto the page with
              no separate panel, letterboxing or visible seam needed. */}
          <Image
            source={{ uri: "/hero/hero-products.png" }}
            style={[StyleSheet.absoluteFill, webHeroImageCoolStyle]}
            resizeMode="cover"
          />
          {/* Blend the photo's left edge into the blue backdrop instead of a visible rectangle. */}
          <LinearGradient
            pointerEvents="none"
            colors={[colors.paleBlue, "rgba(238,244,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.heroImageLeftFade}
          />
          {/* 120px fade from transparent into the flat #F7F8FA that every other page uses as its
              background, so the hero ends with no hard line against the listings below. */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(238,244,255,0)", colors.offWhite]}
            style={styles.heroBottomFade}
          />
          {/* Notification bell anchored to the hero's own top-right corner, flush with the page
              edge, independent of the headline column. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadNotifications > 0
                ? `Notifications, ${unreadNotifications} unread`
                : "Notifications"
            }
            onPress={() => user ? router.push("/notifications") : setAuthPrompt(true)}
            style={styles.heroNotificationButton}
          >
            <Ionicons name="notifications-outline" size={21} color={colors.navy} />
            {unreadNotifications > 0 && (
              <View style={styles.notificationCount}>
                <Text style={styles.notificationCountText}>
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </Text>
              </View>
            )}
          </Pressable>
          <View style={[styles.heroContainer, isDesktop && styles.desktopHeroContainer]}>
            <View
              style={[
                styles.heroContent,
                isMobile && styles.mobileHeroContent,
                isDesktop && styles.desktopHeroContent,
                { width: isDesktop ? (width >= 1600 ? "43%" : "52%") : "100%" },
              ]}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.eyebrowBadge}>
                  <Text style={styles.eyebrowText}>RENTALS ACROSS MALAYSIA</Text>
                </View>
              </View>

              {/* Main Headline */}
              <Text style={[styles.heroHeadline, isMobile && styles.mobileHeroHeadline]}>
                Rent what you need.{"\n"}Earn from what you own.
              </Text>

              {/* Subtitle */}
              <Text style={[styles.heroSubhead, isMobile && styles.mobileHeroSubhead, isMobile && width >= 375 && styles.mobileHeroSubheadWithProduct]}>
                Useful things, nearby. Discover trusted rentals across Malaysia
                or turn your idle gear into extra income.
              </Text>

              {/* Search Bar Container */}
              <View style={[styles.searchContainer, isDesktop && styles.desktopSearchContainer, isMobile && styles.mobileSearchContainer]}>
                <View style={styles.searchInputRow}>
                  <Ionicons name="search-outline" size={19} color={colors.muted} />
                  <TextInput
                    accessibilityLabel="Search items"
                    placeholder="Search cameras, tools, speakers..."
                    placeholderTextColor="#64748B"
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
                  <Text style={[styles.locationBtnText, isMobile && styles.mobileLocationText]} numberOfLines={isMobile ? 2 : 1}>
                    {selectedLocation}
                  </Text>
                  <Ionicons
                    name={showLocationPicker ? "chevron-up" : "chevron-down"}
                    size={14}
                    color={colors.navy}
                  />
                </Pressable>

                {/* Search submit button */}
                {isDesktop ? (
                  <MagneticGlow
                    accessibilityLabel="Search marketplace"
                    onPress={() => router.setParams({ q: searchQuery.trim() })}
                    style={styles.searchSubmitBtn}
                  >
                    <Ionicons name="search" size={18} color="white" />
                    <Text style={styles.searchSubmitText}>Search</Text>
                  </MagneticGlow>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Search marketplace"
                    onPress={() => router.setParams({ q: searchQuery.trim() })}
                    style={[styles.searchSubmitBtn, isMobile && styles.mobileSearchSubmitBtn]}
                  >
                    <Ionicons name="search" size={18} color="white" />
                    {isMobile && <Text style={styles.searchSubmitText}>Search</Text>}
                  </Pressable>
                )}
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

                <Text style={styles.categoryLabel}>Explore by category</Text>
                <View style={styles.categoryScrollWrap}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    style={[styles.mobileCategoryScroll, webHideScrollbarStyle]}
                    contentContainerStyle={styles.categoryChips}
                  >
                    {visibleCategories.map((category) => {
                      const selected = mobileCategory === category;
                      return (
                        <Pressable key={category} accessibilityRole="button" accessibilityLabel={`Filter by ${category}`} accessibilityState={{ selected }} onPress={() => setMobileCategory(category)} style={[styles.categoryChip, selected && styles.categoryChipSelected]}>
                          <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{category}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                  {/* Right-edge fade hints that more chips are scrollable past the visible edge. */}
                  <LinearGradient
                    pointerEvents="none"
                    colors={["rgba(238,244,255,0)", colors.paleBlue]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.categoryScrollFade}
                  />
                </View>
            </View>

          </View>
        </View>

        {/* =========================================================================
            2. DISCOVERY CATALOGUE SECTION (Merged Explore Functionality)
            Full-bleed light-blue band so the colour runs edge-to-edge with no seam against
            the hero above it, regardless of viewport width; inner content stays centred.
           ========================================================================= */}
        <View style={styles.catalogueBand}>
        <View style={[styles.catalogueSection, isMobile && styles.mobileCatalogueSection]}>
          <View style={[styles.catalogueControlsRow, isMobile && styles.mobileCatalogueControlsRow]}>
            {/* Left: Results count & active category indicator */}
            <View style={{ flex: 1 }}>
              <Text style={styles.resultsCount}>
                {mobileCategory === "All Categories" ? "All Items" : mobileCategory}{" "}
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
    backgroundColor: colors.paleBlue,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 36,
    overflow: "hidden",
  },
  // A sensible minimum height keeps the hero from becoming extremely short-and-wide on large
  // monitors, which would force resizeMode="cover" to crop the product photo too aggressively.
  desktopHeroWrapper: { paddingLeft: "20%", paddingRight: "7.5%", paddingTop: 26, paddingBottom: 26, minHeight: 460 },
  mobileHeroWrapper: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 10, overflow: "hidden" },
  heroContainer: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  desktopHeroContainer: { maxWidth: 1600, alignItems: "flex-start" },
  heroContent: {
    gap: 16,
  },
  desktopHeroContent: { gap: 10, maxWidth: 620 },
  mobileHeroContent: { gap: 10 },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignSelf: "flex-start",
  },
  eyebrowText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  heroHeadline: {
    color: "#102B50",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1.2,
    lineHeight: 46,
  },
  mobileHeroHeadline: { fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  heroSubhead: {
    color: "#405A78",
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 520,
  },
  mobileHeroSubhead: { fontSize: 13, lineHeight: 19 },
  mobileHeroSubheadWithProduct: { maxWidth: 210 },
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
  desktopSearchContainer: { marginTop: 2, maxWidth: 620, padding: 5, gap: 5 },
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
  mobileLocationText: { flexShrink: 1, fontSize: 11, lineHeight: 14 },
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
  categoryLabel: { color: "#102B50", fontSize: 12, fontWeight: "700" },
  categoryScrollWrap: { position: "relative" },
  mobileCategoryScroll: { marginTop: 4, flexGrow: 0 },
  categoryChips: { alignItems: "center", gap: 8, paddingVertical: 3, paddingRight: 18 },
  categoryScrollFade: { position: "absolute", right: 0, top: 4, bottom: 0, width: 32 },
  categoryChip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", cursor: "pointer" },
  categoryChipSelected: { backgroundColor: colors.blue, borderColor: colors.blue },
  categoryChipText: { color: colors.navy, fontSize: 12, fontWeight: "700" },
  categoryChipTextSelected: { color: colors.white },
  // Floating Hero Showcase
  // Catalogue section
  // Blends the photo's left edge into the surrounding blue backdrop.
  heroImageLeftFade: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "18%",
  },
  // 120px transparent-to-#EEF4FF fade so the hero ends flush into the catalogue band's colour.
  heroBottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  heroNotificationButton: {
    position: "absolute",
    top: 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    zIndex: 3,
  },
  catalogueBand: {
    // Flat #F7F8FA — same shared page background used by every other screen; the hero above
    // already provides the blue wash, so no gradient is repeated here.
    backgroundColor: colors.offWhite,
    marginTop: -32,
  },
  catalogueSection: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 16,
  },
  mobileCatalogueSection: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, gap: 12 },
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
