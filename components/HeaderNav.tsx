import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors } from "../constants/theme";
import { useMarketplace } from "../context/Marketplace";

export function HeaderNav({
  activeRoute = "home",
  onScrollToSection,
}: {
  activeRoute?: "home" | "explore" | "owner" | "help" | "messages" | "profile";
  onScrollToSection?: (sectionKey: string) => void;
}) {
  const { width } = useWindowDimensions();
  const { state, user, act } = useMarketplace();
  const isDesktop = width >= 800;

  const unreadNotices = state.notifications.filter(
    (n) => n.userId === user?.id && !n.read,
  ).length;

  return (
    <View style={styles.wrapper}>
      {/* Persistent Demo Mode Banner if in admin_demo mode */}
      {state.mode === "admin_demo" && (
        <View style={styles.demoBanner}>
          <View style={styles.demoBannerInner}>
            <View style={styles.demoBadge}>
              <View style={styles.demoPulseDot} />
              <Text style={styles.demoBadgeText}>DEMO MODE — Fictional Sample Data</Text>
            </View>
            <View style={styles.demoControls}>
              <Text style={styles.demoPersonaLabel}>Persona:</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => act({ type: "login", userId: "demo-renter" })}
                style={[
                  styles.personaBtn,
                  user?.id === "demo-renter" && styles.personaBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.personaBtnText,
                    user?.id === "demo-renter" && styles.personaBtnTextActive,
                  ]}
                >
                  Renter (Alex)
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => act({ type: "login", userId: "owner-aiman" })}
                style={[
                  styles.personaBtn,
                  user?.id === "owner-aiman" && styles.personaBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.personaBtnText,
                    user?.id === "owner-aiman" && styles.personaBtnTextActive,
                  ]}
                >
                  Lender (Aiman)
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => act({ type: "resetDemoState" })}
                style={styles.demoActionBtn}
              >
                <Ionicons name="refresh-outline" size={13} color="#CBD5E1" />
                <Text style={styles.demoActionBtnText}>Reset Demo Data</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => act({ type: "setMode", mode: "normal" })}
                style={[styles.demoActionBtn, styles.exitDemoBtn]}
              >
                <Ionicons name="exit-outline" size={13} color="#F87171" />
                <Text style={[styles.demoActionBtnText, { color: "#F87171" }]}>Exit Demo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <View style={styles.container}>
        <View style={styles.inner}>
          {/* Brand */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="CurRENT Home"
            onPress={() => router.push("/(tabs)")}
            style={styles.brandContainer}
          >
            <Text style={styles.brandText}>
              Cur<Text style={{ color: colors.blue }}>RENT</Text>
              <Text style={styles.brandDot}> ●</Text>
            </Text>
            <Text style={styles.brandTag}>Klang Valley</Text>
          </Pressable>

          {/* Desktop Nav Links */}
          {isDesktop && (
            <View style={styles.navLinks}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/(tabs)/explore")}
                style={styles.navLink}
              >
                <Text
                  style={[
                    styles.navLinkText,
                    activeRoute === "explore" && styles.navLinkActive,
                  ]}
                >
                  Browse rentals
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (onScrollToSection) onScrollToSection("howItWorks");
                  else router.push("/help");
                }}
                style={styles.navLink}
              >
                <Text style={styles.navLinkText}>How it works</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/owner")}
                style={styles.navLink}
              >
                <Text
                  style={[
                    styles.navLinkText,
                    activeRoute === "owner" && styles.navLinkActive,
                  ]}
                >
                  List an item
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (onScrollToSection) onScrollToSection("safety");
                  else router.push("/help");
                }}
                style={styles.navLink}
              >
                <Text style={styles.navLinkText}>Safety</Text>
              </Pressable>
            </View>
          )}

          {/* Right Action Icons & Profile */}
          <View style={styles.actions}>
            {state.mode !== "admin_demo" && (
              <Pressable
                accessibilityLabel="Admin Demo"
                accessibilityRole="button"
                onPress={() => act({ type: "setMode", mode: "admin_demo" })}
                style={styles.adminDemoBtn}
              >
                <Ionicons name="flask-outline" size={15} color={colors.blue} />
                <Text style={styles.adminDemoBtnText}>Admin Demo</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityLabel="Messages"
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/messages")}
              style={styles.iconBtn}
            >
              <Ionicons
                name="chatbubbles-outline"
                size={20}
                color={colors.navy}
              />
              {isDesktop && <Text style={styles.iconLabel}>Messages</Text>}
            </Pressable>

            <Pressable
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              onPress={() => router.push("/notifications")}
              style={styles.iconBtn}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={colors.navy}
              />
              {unreadNotices > 0 && <View style={styles.unreadDot} />}
            </Pressable>

            <Pressable
              accessibilityLabel="Profile"
              accessibilityRole="button"
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.profileBtn}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name
                    ? user.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                    : "Hi"}
                </Text>
              </View>
              {isDesktop && (
                <Text style={styles.profileText}>
                  {user ? user.name.split(" ")[0] : "Profile"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  inner: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  brandText: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -1,
    color: colors.navy,
  },
  brandDot: {
    color: colors.blue,
    fontSize: 10,
  },
  brandTag: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "500",
  },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  navLink: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.navy,
  },
  navLinkActive: {
    color: colors.blue,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 6,
    position: "relative",
  },
  iconLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.navy,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
    position: "absolute",
    top: 4,
    right: 4,
  },
  profileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.paleBlue,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
  profileText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  wrapper: {
    width: "100%",
  },
  demoBanner: {
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  demoBannerInner: {
    maxWidth: 1180,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  demoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  demoPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  demoBadgeText: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  demoControls: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  demoPersonaLabel: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginRight: 2,
  },
  personaBtn: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  personaBtnActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  personaBtnText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
  personaBtnTextActive: {
    color: "white",
    fontWeight: "700",
  },
  demoActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1E293B",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  demoActionBtnText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
  exitDemoBtn: {
    borderColor: "rgba(239, 68, 68, 0.4)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  adminDemoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  adminDemoBtnText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "700",
  },
});

