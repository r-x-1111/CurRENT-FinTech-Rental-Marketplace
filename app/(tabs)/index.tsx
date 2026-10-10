import React, { useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { HeaderNav } from "../../components/HeaderNav";
import { Footer } from "../../components/Footer";
import { ListingGrid } from "../../components/ListingGrid";
import { RiskGauge } from "../../components/RiskGauge";
import { colors } from "../../constants/theme";
import { categories, locations } from "../../constants/categories";
import { useMarketplace } from "../../context/Marketplace";

export default function HomeScreen() {
  const { state, user } = useMarketplace();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const scrollRef = useRef<ScrollView>(null);
  const howItWorksY = useRef(0);
  const safetyY = useRef(0);

  // Search & filter state in Hero
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All Klang Valley");
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Earning Calculator state in "List Your Item" section
  const [calcItemName, setCalcItemName] = useState("Sony A7 III Camera");
  const [calcDailyPrice, setCalcDailyPrice] = useState("45");
  const [calcBoost, setCalcBoost] = useState(false);

  const priceNum = Number(calcDailyPrice) || 0;
  const estimatedPayout = Math.round(priceNum * 0.88 * 100) / 100;

  function handleSearch() {
    router.push({
      pathname: "/(tabs)/explore",
      params: {
        q: searchQuery,
        location: selectedLocation === "All Klang Valley" ? "" : selectedLocation,
      },
    });
  }

  function handleCategoryClick(cat: string) {
    router.push({
      pathname: "/(tabs)/explore",
      params: { category: cat },
    });
  }

  function scrollToSection(key: string) {
    if (key === "howItWorks") {
      scrollRef.current?.scrollTo({ y: howItWorksY.current - 20, animated: true });
    } else if (key === "safety") {
      scrollRef.current?.scrollTo({ y: safetyY.current - 20, animated: true });
    }
  }

  // Active bookings for renter reminder
  const activeBookings = state.bookings.filter(
    (b) =>
      b.renterId === user?.id &&
      ["active", "upcoming", "approved", "return_pending"].includes(b.status),
  );

  // Popular items (first 6 items, with boosted listings featured first)
  const popularListings = [...state.listings]
    .filter((l) => l.status === "published")
    .sort((a, b) => {
      const now = Date.now();
      const aBoosted = a.featuredUntil && new Date(a.featuredUntil).getTime() > now ? 1 : 0;
      const bBoosted = b.featuredUntil && new Date(b.featuredUntil).getTime() > now ? 1 : 0;
      return bBoosted - aBoosted;
    })
    .slice(0, 6);

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.screen}>
      {/* Top Navbar */}
      <HeaderNav activeRoute="home" onScrollToSection={scrollToSection} />

      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* =========================================================================
            1. HERO SECTION (Matches Canva Page 2)
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
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                    style={styles.searchInput}
                  />
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
                  onPress={handleSearch}
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

              {/* Quick Categories pills */}
              <View style={styles.quickCatRow}>
                <Text style={styles.quickCatLabel}>Quick categories:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                >
                  {categories
                    .filter((c) => c !== "All items")
                    .map((cat) => (
                      <Pressable
                        key={cat}
                        accessibilityRole="button"
                        onPress={() => handleCategoryClick(cat)}
                        style={styles.quickCatPill}
                      >
                        <Text style={styles.quickCatText}>{cat}</Text>
                      </Pressable>
                    ))}
                </ScrollView>
              </View>

              {/* CTA Action Buttons */}
              <View style={styles.heroBtnRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/(tabs)/explore")}
                  style={styles.primaryHeroBtn}
                >
                  <Text style={styles.primaryHeroBtnText}>Browse Rentals</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/owner")}
                  style={styles.secondaryHeroBtn}
                >
                  <Text style={styles.secondaryHeroBtnText}>List an item</Text>
                </Pressable>
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

        {/* Active Rental Banner (If user has in-progress rentals) */}
        {activeBookings.length > 0 && (
          <View style={styles.sectionWrap}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/rentals")}
              style={styles.activeRentalBanner}
            >
              <Ionicons name="bag-handle-outline" size={24} color={colors.blue} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeBannerTitle}>
                  You have {activeBookings.length} active rental
                  {activeBookings.length > 1 ? "s" : ""}
                </Text>
                <Text style={styles.activeBannerSub}>
                  Latest: {activeBookings[0].title} · Tap to track handover & return.
                </Text>
              </View>
              <Text style={styles.activeBannerLink}>View rentals →</Text>
            </Pressable>
          </View>
        )}

        {/* =========================================================================
            2. HOW IT WORKS SECTION (Matches Canva Page 2)
           ========================================================================= */}
        <View
          onLayout={(e) => {
            howItWorksY.current = e.nativeEvent.layout.y;
          }}
          style={styles.sectionWrap}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTag}>HOW IT WORKS</Text>
            <Text style={styles.sectionTitle}>A simple way to rent.</Text>
          </View>

          <View
            style={[
              styles.stepsGrid,
              { flexDirection: isDesktop ? "row" : "column" },
            ]}
          >
            {/* Step 1 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>01</Text>
              </View>
              <View style={styles.stepIconWrap}>
                <Ionicons name="search-outline" size={22} color={colors.blue} />
              </View>
              <Text style={styles.stepTitle}>Search</Text>
              <Text style={styles.stepDesc}>
                Search for the item you need from trusted owners in Klang Valley.
              </Text>
            </View>

            {/* Step 2 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>02</Text>
              </View>
              <View style={styles.stepIconWrap}>
                <Ionicons name="calendar-outline" size={22} color={colors.blue} />
              </View>
              <Text style={styles.stepTitle}>Review</Text>
              <Text style={styles.stepDesc}>
                Select your rental dates and review the rental fee, service fee and
                risk-based deposit.
              </Text>
            </View>

            {/* Step 3 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>03</Text>
              </View>
              <View style={styles.stepIconWrap}>
                <Ionicons name="card-outline" size={22} color={colors.blue} />
              </View>
              <Text style={styles.stepTitle}>Pay</Text>
              <Text style={styles.stepDesc}>
                Complete secure payment through an authorised provider (Simulated
                in this demo).
              </Text>
            </View>

            {/* Step 4 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>04</Text>
              </View>
              <View style={styles.stepIconWrap}>
                <Ionicons name="sync-outline" size={22} color={colors.blue} />
              </View>
              <Text style={styles.stepTitle}>Return</Text>
              <Text style={styles.stepDesc}>
                Upload return photos or videos. Once both parties confirm return
                (No-Issues) independently, the deposit is released.
              </Text>
            </View>
          </View>
        </View>

        {/* =========================================================================
            3. POPULAR RENTALS SECTION (Matches Canva Page 2)
           ========================================================================= */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionRowBetween}>
            <View>
              <Text style={styles.sectionTag}>POPULAR RENTALS</Text>
              <Text style={styles.sectionTitle}>Popular near you</Text>
              <Text style={styles.sectionSubtitle}>
                A few useful picks currently available around Klang Valley.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/explore")}
              style={styles.browseAllBtn}
            >
              <Text style={styles.browseAllText}>Browse all rentals →</Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 20 }}>
            <ListingGrid listings={popularListings} />
          </View>
        </View>

        {/* =========================================================================
            4. WHY CURRENT IS SAFER (Trust & Safety, Matches Canva Page 4)
           ========================================================================= */}
        <View
          onLayout={(e) => {
            safetyY.current = e.nativeEvent.layout.y;
          }}
          style={styles.sectionWrap}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTag}>WHY CURRENT IS SAFER</Text>
            <Text style={styles.sectionTitle}>
              Confidence, built into the journey.
            </Text>
            <Text style={styles.sectionSubtitle}>
              Simple signals and partner-supported services help renters and
              owners make better decisions before booking.
            </Text>
          </View>

          <View
            style={[
              styles.trustGrid,
              { flexDirection: isDesktop ? "row" : "column" },
            ]}
          >
            {/* Trust Card 1: Verified Users */}
            <View style={styles.trustCard}>
              <View style={styles.trustIconContainer}>
                <Ionicons
                  name="shield-checkmark"
                  size={26}
                  color={colors.blue}
                />
              </View>
              <Text style={styles.trustCardTitle}>Verified Users</Text>
              <Text style={styles.trustCardBody}>
                Identity checks are completed by authorised external eKYC
                providers before booking.
              </Text>
            </View>

            {/* Trust Card 2: Rental Risk Score with Gauge Visual (Dark featured card matching website screenshot) */}
            <View style={[styles.trustCard, styles.trustCardFeatured]}>
              <View style={styles.trustIconContainerFeatured}>
                <Ionicons name="speedometer-outline" size={26} color="#38BDF8" />
              </View>
              <Text style={styles.trustCardTitleFeatured}>Renter Rental Risk Score</Text>
              <RiskGauge
                score={75}
                label="Medium Risk"
              />
              <Text style={styles.trustCardBodyFeatured}>
                It is assessed based on identity verification, rental history and
                transaction behaviour, and is reassessed after every completed rental.
              </Text>
            </View>

            {/* Trust Card 3: Secure Deposit */}
            <View style={styles.trustCard}>
              <View style={styles.trustIconContainer}>
                <Ionicons name="lock-closed" size={26} color={colors.blue} />
              </View>
              <Text style={styles.trustCardTitle}>Secure Deposit</Text>
              <Text style={styles.trustCardBody}>
                Refundable deposits are shown clearly before you request a rental.
                Released automatically after clean return confirmation.
              </Text>
            </View>

            {/* Trust Card 4: Item Protection */}
            <View style={styles.trustCard}>
              <View style={styles.trustIconContainer}>
                <Ionicons name="umbrella" size={26} color={colors.blue} />
              </View>
              <Text style={styles.trustCardTitle}>Item Protection</Text>
              <Text style={styles.trustCardBody}>
                Eligible high-value items may receive protection of up to RM60,000
                through an authorised external insurance partner.
              </Text>
            </View>
          </View>
        </View>

        {/* =========================================================================
            5. LIST YOUR ITEM SECTION (Earning Calculator, Matches Canva Page 4)
           ========================================================================= */}
        <View style={styles.sectionWrap}>
          <View
            style={[
              styles.listYourItemBox,
              { flexDirection: isDesktop ? "row" : "column" },
            ]}
          >
            {/* Left pitch */}
            <View style={{ flex: 1, gap: 14 }}>
              <Text style={styles.sectionTagLight}>LIST YOUR ITEM</Text>
              <Text style={styles.pitchHeadline}>
                Your unused gear has earning potential.
              </Text>
              <Text style={styles.pitchBody}>
                Create a clear listing in minutes and manage bookings, messages
                and rental status in one place.
              </Text>

              <View style={{ gap: 10, marginTop: 10 }}>
                <View style={styles.checkRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  <Text style={styles.checkText}>
                    Set your daily price and availability
                  </Text>
                </View>
                <View style={styles.checkRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  <Text style={styles.checkText}>
                    View renter verification and Rental Risk Score
                  </Text>
                </View>
                <View style={styles.checkRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                  <Text style={styles.checkText}>
                    Keep booking messages in one place
                  </Text>
                </View>
              </View>
            </View>

            {/* Right form preview / calculator */}
            <View style={styles.calculatorCard}>
              <Text style={styles.calcCardTitle}>Quick Listing Estimator</Text>

              <View style={styles.calcField}>
                <Text style={styles.calcLabel}>Item name</Text>
                <TextInput
                  value={calcItemName}
                  onChangeText={setCalcItemName}
                  style={styles.calcInput}
                  placeholder="e.g. Sony A7 III Camera"
                />
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={[styles.calcField, { flex: 1 }]}>
                  <Text style={styles.calcLabel}>Daily price (RM)</Text>
                  <TextInput
                    value={calcDailyPrice}
                    onChangeText={setCalcDailyPrice}
                    keyboardType="numeric"
                    style={styles.calcInput}
                  />
                </View>

                <View style={[styles.calcField, { flex: 1 }]}>
                  <Text style={styles.calcLabel}>Estimated payout (RM/day)</Text>
                  <View style={styles.calcPayoutBox}>
                    <Text style={styles.calcPayoutText}>
                      RM{estimatedPayout.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.calcField}>
                <Text style={styles.calcLabel}>Location</Text>
                <Text style={styles.calcLocationText}>
                  Petaling Jaya · Klang Valley
                </Text>
              </View>

              {/* Boost checkbox */}
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: calcBoost }}
                onPress={() => setCalcBoost(!calcBoost)}
                style={styles.boostRow}
              >
                <Ionicons
                  name={calcBoost ? "checkbox" : "square-outline"}
                  size={20}
                  color={colors.blue}
                />
                <Text style={styles.boostText}>
                  Optional Listing Boost — RM10 (Featured for 7 days)
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/owner")}
                style={styles.publishBtn}
              >
                <Text style={styles.publishBtnText}>Publish listing</Text>
              </Pressable>

              <Text style={styles.calcDisclaimer}>
                CurRENT charges a 12% commission only when a rental is successfully
                completed. Your payout will be released once the deposit has been
                settled.
              </Text>
            </View>
          </View>
        </View>

        {/* =========================================================================
            6. CLOSING CALL TO ACTION BANNER (Matches Canva Page 5)
           ========================================================================= */}
        <View style={styles.sectionWrap}>
          <View
            style={[
              styles.closingBanner,
              { flexDirection: isDesktop ? "row" : "column" },
            ]}
          >
            <View style={{ flex: 1, gap: 10 }}>
              <Text style={styles.closingHeadline}>Own less. Access more.</Text>
              <Text style={styles.closingSub}>
                Find what you need today, or let the things you own work harder
                tomorrow.
              </Text>
            </View>

            <View style={styles.closingBtnRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(tabs)/explore")}
                style={styles.closingPrimaryBtn}
              >
                <Text style={styles.closingPrimaryText}>Browse Rentals</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/owner")}
                style={styles.closingSecondaryBtn}
              >
                <Text style={styles.closingSecondaryText}>List an Item</Text>
              </Pressable>
            </View>
          </View>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  quickCatText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  heroBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  primaryHeroBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryHeroBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryHeroBtn: {
    backgroundColor: "transparent",
    borderColor: "white",
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryHeroBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
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
    fontWeight: "700",
  },
  // Section Layout Wrapper
  sectionWrap: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
    marginTop: 40,
  },
  sectionHeader: {
    gap: 6,
    marginBottom: 20,
  },
  sectionRowBetween: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  sectionTag: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: colors.blue,
    textTransform: "uppercase",
  },
  sectionTagLight: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#99C0FF",
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.navy,
    letterSpacing: -0.6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  browseAllBtn: {
    paddingVertical: 6,
  },
  browseAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.blue,
  },
  // Steps Grid (How it works)
  stepsGrid: {
    gap: 16,
  },
  stepCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
    position: "relative",
  },
  stepNumberBadge: {
    backgroundColor: colors.paleBlue,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.blue,
  },
  stepIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.softBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.navy,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  // Trust Grid (Why CurRENT is safer)
  trustGrid: {
    gap: 16,
  },
  trustCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    gap: 12,
  },
  trustCardFeatured: {
    backgroundColor: "#0B192C",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 4,
  },
  trustIconContainerFeatured: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  trustCardTitleFeatured: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  trustCardBodyFeatured: {
    fontSize: 13,
    lineHeight: 20,
    color: "#94A3B8",
  },
  trustIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.paleBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  trustCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
  },
  trustCardBody: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.muted,
  },
  // List Your Item Section Box
  listYourItemBox: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 28,
    gap: 28,
  },
  pitchHeadline: {
    fontSize: 26,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  pitchBody: {
    fontSize: 14,
    lineHeight: 22,
    color: "#C5D2E2",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkText: {
    color: "white",
    fontSize: 13,
    fontWeight: "500",
  },
  calculatorCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 22,
    gap: 14,
  },
  calcCardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.navy,
  },
  calcField: {
    gap: 6,
  },
  calcLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.navy,
  },
  calcInput: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.navy,
  },
  calcPayoutBox: {
    backgroundColor: colors.paleBlue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  calcPayoutText: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.blue,
  },
  calcLocationText: {
    fontSize: 13,
    color: colors.muted,
  },
  boostRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  boostText: {
    fontSize: 12,
    color: colors.navy,
    fontWeight: "600",
  },
  publishBtn: {
    backgroundColor: colors.blue,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  publishBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  calcDisclaimer: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
  // Dashboard Preview Card
  dashboardPreviewCard: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    gap: 14,
  },
  previewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  previewSub: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  previewItemTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.navy,
  },
  previewDue: {
    fontSize: 13,
    color: colors.muted,
  },
  activeTag: {
    backgroundColor: "#E7F6EC",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803D",
  },
  previewDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  previewBottom: {
    justifyContent: "space-between",
  },
  previewStatLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  previewStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  // Active rental banner
  activeRentalBanner: {
    backgroundColor: colors.paleBlue,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#C5DFFF",
  },
  activeBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  activeBannerSub: {
    fontSize: 12,
    color: colors.muted,
  },
  activeBannerLink: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.blue,
  },
  // Review Cards Grid
  reviewsGrid: {
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
    flex: 1,
  },
  reviewAuthor: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "500",
  },
  reviewText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.text,
  },
  // Closing CTA Banner
  closingBanner: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
  },
  closingHeadline: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  closingSub: {
    color: "#C5D2E2",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 480,
  },
  closingBtnRow: {
    flexDirection: "row",
    gap: 12,
  },
  closingPrimaryBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  closingPrimaryText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  closingSecondaryBtn: {
    backgroundColor: "transparent",
    borderColor: "white",
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  closingSecondaryText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
});
