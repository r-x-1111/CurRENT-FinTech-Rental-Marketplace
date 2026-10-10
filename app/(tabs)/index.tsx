import React, { useEffect, useState } from "react";
import {
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
import { Footer } from "../../components/Footer";
import { ListingGrid } from "../../components/ListingGrid";
import { Empty } from "../../components/ui";
import { colors } from "../../constants/theme";
import { MAIN_CATEGORIES, locations } from "../../constants/categories";
import { useMarketplace } from "../../context/Marketplace";

export default function HomeScreen() {
  const { state, user } = useMarketplace();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    saved?: string;
    location?: string;
  }>();

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState(params.q || "");
  const [selectedCategory, setSelectedCategory] = useState(params.category || "All items");
  const [selectedLocation, setSelectedLocation] = useState(params.location || "All Klang Valley");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [savedOnly, setSavedOnly] = useState(params.saved === "1");

  useEffect(() => {
    if (params.q !== undefined) setSearchQuery(params.q);
    if (params.category !== undefined) setSelectedCategory(params.category);
    if (params.saved !== undefined) setSavedOnly(params.saved === "1");
    if (params.location !== undefined) setSelectedLocation(params.location || "All Klang Valley");
  }, [params.q, params.category, params.saved, params.location]);

  function handleCategoryClick(cat: string) {
    if (selectedCategory === cat) {
      setSelectedCategory("All items");
    } else {
      setSelectedCategory(cat);
    }
  }

  function handleClearFilters() {
    setSearchQuery("");
    setSelectedCategory("All items");
    setSelectedLocation("All Klang Valley");
    setSavedOnly(false);
  }

  // Filter listings based on search, category, location, and saved-only
  const filteredListings = state.listings
    .filter((l) => {
      if (l.status !== "published") return false;
      if (selectedCategory !== "All items" && l.category !== selectedCategory) return false;
      if (savedOnly && !user?.favourites.includes(l.id)) return false;
      if (
        selectedLocation !== "All Klang Valley" &&
        !l.location.toLowerCase().includes(selectedLocation.toLowerCase())
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
    selectedLocation !== "All Klang Valley" ||
    savedOnly;

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* =========================================================================
            1. HERO SECTION (Canva Page 2 Dark Navy Anchor)
           ========================================================================= */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroContainer}>
            <View
              style={[
                styles.heroContent,
                { width: isDesktop ? "62%" : "100%" },
              ]}
            >
              {/* Eyebrow badge */}
              <View style={styles.eyebrowBadge}>
                <Text style={styles.eyebrowText}>KLANG VALLEY RENTALS</Text>
              </View>

              {/* Main Headline */}
              <Text style={styles.heroHeadline}>
                Rent what you need.{"\n"}Earn from what you own.
              </Text>

              {/* Subtitle */}
              <Text style={styles.heroSubhead}>
                Useful things, nearby. Discover trusted rentals across Klang Valley
                or turn your idle gear into extra income.
              </Text>

              {/* Search Bar Container */}
              <View style={styles.searchContainer}>
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

                {/* Location selector toggle */}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setShowLocationPicker(!showLocationPicker)}
                  style={styles.locationDropdownBtn}
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
                  style={styles.searchSubmitBtn}
                >
                  <Ionicons name="search" size={18} color="white" />
                  {isDesktop && <Text style={styles.searchSubmitText}>Search</Text>}
                </Pressable>
              </View>

              {/* Location Picker dropdown items */}
              {showLocationPicker && (
                <View style={styles.locationDropdownList}>
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
                </View>
              )}

              {/* 8 Main Categories pills */}
              <View style={styles.quickCatRow}>
                <Text style={styles.quickCatLabel}>Categories:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedCategory("All items")}
                    style={[
                      styles.quickCatPill,
                      selectedCategory === "All items" && styles.quickCatPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickCatText,
                        selectedCategory === "All items" && styles.quickCatTextActive,
                      ]}
                    >
                      All items
                    </Text>
                  </Pressable>
                  {MAIN_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <Pressable
                        key={cat}
                        accessibilityRole="button"
                        onPress={() => handleCategoryClick(cat)}
                        style={[
                          styles.quickCatPill,
                          isSelected && styles.quickCatPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.quickCatText,
                            isSelected && styles.quickCatTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
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
        <View style={styles.catalogueSection}>
          <View style={styles.catalogueControlsRow}>
            {/* Left: Results count & active category indicator */}
            <View style={{ flex: 1 }}>
              <Text style={styles.resultsCount}>
                {selectedCategory !== "All items" ? selectedCategory : "Marketplace"}{" "}
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
                  onValueChange={setSavedOnly}
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
            <ListingGrid listings={filteredListings} />
          ) : (
            <Empty
              title="No matches found"
              text="Try adjusting your keyword, choosing a different category, or turning off the Saved only filter."
              action="Reset search & filters"
              onPress={handleClearFilters}
            />
          )}
        </View>

        {/* Footer */}
        <Footer />
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
    paddingBottom: 20,
  },
  // Hero Styles
  heroWrapper: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
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
  eyebrowBadge: {
    backgroundColor: "#16335C",
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
  heroSubhead: {
    color: "#C5D2E2",
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 520,
  },
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
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 140,
  },
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
  quickCatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  quickCatLabel: {
    fontSize: 12,
    color: "#8FA3BF",
    fontWeight: "600",
  },
  quickCatPill: {
    backgroundColor: "#16335C",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  quickCatPillActive: {
    backgroundColor: colors.blue,
    borderColor: "white",
  },
  quickCatText: {
    color: "#DCEBFF",
    fontSize: 12,
    fontWeight: "600",
  },
  quickCatTextActive: {
    color: "white",
    fontWeight: "800",
  },
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
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  clearBtnText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
});
