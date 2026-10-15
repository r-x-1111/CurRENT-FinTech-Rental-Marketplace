import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  Card,
  Chips,
  Field,
  Notice,
  PhotoPicker,
  Screen,
  s,
} from "../../components/ui";
import { useMarketplace } from "../../context/Marketplace";
import { riskFor } from "../../services/booking";
import { colors } from "../../constants/theme";
import { RiskGauge } from "../../components/RiskGauge";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { signOutAuthenticatedAccount } from "../../services/auth";

export default function ProfileScreen() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { state, user, act, actAndPersist, closeAuthenticatedWorkspace } = useMarketplace();
  const width = useWindowDimensions().width;
  const isMobile = width <= 430;
  const narrow = width < 350;
  const [ekycY, setEkycY] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [documentType, setDocumentType] = useState("MyKad");
  const [sampledDocuments, setSampledDocuments] = useState<string[]>([]);
  const [scanningFace, setScanningFace] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!user) {
    return <Screen title="Profile" subtitle="Welcome to CurRENT">
      <Card>
        <Text style={s.h2}>Your CurRENT account</Text>
        <Text style={[s.body, { marginVertical: 14 }]}>Log in or create an account to manage your rentals, bookings and profile.</Text>
        <Button onPress={() => router.push({ pathname: "/auth", params: { returnTo: "/(tabs)/profile" } })}>Log In</Button>
        <View style={{ height: 10 }} />
        <Button secondary onPress={() => router.push({ pathname: "/auth", params: { mode: "Create account", returnTo: "/(tabs)/profile" } })}>Sign Up</Button>
      </Card>
    </Screen>;
  }

  const risk = riskFor(state, user);
  const completed = state.bookings.filter(
    (b) => b.renterId === user.id && b.status === "completed",
  ).length;
  const netPoints = (user.riskHistory || []).reduce(
    (acc, item) => acc + item.effectiveAdjustment,
    0,
  );

  async function verify(status: "pending" | "verified" | "failed") {
    try {
      if (status === "verified" && user?.verification !== "pending") {
        await actAndPersist({ type: "verify", status: "pending" });
      }
      await actAndPersist({ type: "verify", status });
      setError("");
      setSuccess(
        status === "verified"
          ? "Demo Verification Successful. Your initial verified score is 80 (Low)."
          : `Verification updated to ${status}.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Screen
      scrollToY={section === "ekyc" ? ekycY : null}
      contentStyle={isMobile ? styles.mobileContent : styles.desktopContent}
    >
      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardTitle}>Renter Dashboard</Text>
        <Text style={styles.dashboardSubtitle}>Welcome back, {user.name}</Text>
      </View>
      {/* Account warnings */}
      {user.isBanned && (
        <Notice
          text="Account Banned: This account is restricted from booking or publishing due to confirmed fraudulent activity."
          error
        />
      )}
      {user.hasOverdueObligation && (
        <Notice
          text="Overdue Damage Settlement: A confirmed damage obligation is overdue by more than 7 days. Direct rental checkout is restricted."
          error
        />
      )}
      {!!error && <Notice text={error} error />}
      {!!success && <Notice text={success} />}

      {/* Profile Overview Card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          {user.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{user.name[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={[s.caption, styles.profileEmail]}>{user.email}</Text>
            <View style={[styles.profileBadge, user.verification === "verified" && styles.profileBadgeVerified]}>
              <Ionicons name={user.verification === "verified" ? "checkmark-circle" : "ellipse-outline"} size={10} color={user.verification === "verified" ? colors.green : colors.blue} />
              <Text style={[styles.profileBadgeText, user.verification === "verified" && styles.profileBadgeTextVerified]}>{user.verification.replaceAll("_", " ")}</Text>
            </View>
            {state.mode === "admin_demo" && (
              <Text style={styles.demoDisclosure}>Fictional account data for demonstration</Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setEditing(!editing);
              setName(user.name);
              setPhotos(user.avatar ? [user.avatar] : []);
            }}
            style={({ pressed }) => [styles.editButton, pressed && styles.supportNavPressed]}
          >
            <Ionicons name="create-outline" size={13} color={colors.blue} />
            <Text style={styles.editButtonText}>Edit profile</Text>
          </Pressable>
        </View>
        {editing && (
          <>
            <Field label="Full name" value={name} onChangeText={setName} />
            <PhotoPicker photos={photos} onChange={setPhotos} single />
            <Button
              onPress={() => {
                try {
                  act({ type: "profile", name, avatar: photos[0] });
                  setEditing(false);
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Save profile
            </Button>
          </>
        )}
      </Card>

      <Pressable accessibilityRole="button" onPress={() => router.push("/owner")} style={({ pressed }) => [styles.lenderButton, pressed && styles.supportNavPressed]}>
        <View pointerEvents="none" style={styles.lenderAccent} />
        <View style={styles.lenderIcon}><Ionicons name="briefcase" size={22} color={colors.white} /></View>
        <View style={{ flex: 1 }}><Text style={styles.lenderTitle}>Lender Mode</Text><Text style={styles.lenderSubtitle}>Switch to manage your listings and earnings</Text></View>
        <Ionicons name="chevron-forward" size={19} color={colors.white} />
      </Pressable>

      {user.hasOverdueObligation && (
        <Card>
          <Text style={[s.bold, { color: "#C53030", fontSize: 15 }]}>
            ⚠️ Confirmed Damage Obligation (Overdue 7+ Days)
          </Text>
          <Text style={[s.caption, { color: "#9B2C2C", marginTop: 4 }]}>
            In accordance with Section 15, renters with an outstanding confirmed
            damage liability unpaid after 7 days are restricted from creating
            new rentals, regardless of risk score.
          </Text>
          <Button
            onPress={() => {
              act({ type: "settleOverdueObligation", userId: user.id });
              setSuccess(
                "Simulated damage obligation settled in full! Booking privileges restored.",
              );
            }}
          >
            Simulate Full Settlement (Clear Obligation & Lift Restriction)
          </Button>
        </Card>
      )}

      <View onLayout={(event) => setEkycY(Math.max(0, event.nativeEvent.layout.y - 16))}>
      <Card style={styles.compactCard}>
        <View style={styles.cardHeading}>
          <View style={styles.headingIcon}><Ionicons name="shield-checkmark" size={17} color={colors.blue} /></View>
          <View style={{ flex: 1 }}><Text style={styles.cardTitle}>Identity Verification (Demo eKYC)</Text><Text style={styles.cardSubtitle}>Simulated eKYC — Demo Only</Text></View>
        </View>
        {user.verification === "verified" ? (
          <>
            <View style={[styles.verificationStage, styles.verificationStageFirst]}>
              <View style={styles.stageIcon}><Ionicons name="document-text-outline" size={22} color={colors.blue} /></View>
              <View style={{ flex: 1 }}><Text style={styles.verificationStageText}>Identity Document</Text><Text style={styles.stageSubtitle}>NRIC or Passport</Text></View>
              <Ionicons name="checkmark-circle" size={22} color={colors.green} />
              <Text style={styles.completedBadge}>Completed</Text>
            </View>
            <View style={styles.verificationStage}>
              <View style={styles.stageIcon}><Ionicons name="scan-outline" size={22} color={colors.blue} /></View>
              <View style={{ flex: 1 }}><Text style={styles.verificationStageText}>Face Verification</Text><Text style={styles.stageSubtitle}>Selfie verifies check</Text></View>
              <Ionicons name="checkmark-circle" size={22} color={colors.green} />
              <Text style={styles.completedBadge}>Completed</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={s.caption}>
              Simulated eKYC — Demo Only. No real identity documents or
              biometric data are collected.
            </Text>
            <Chips
              options={["MyKad", "Passport"]}
              selected={documentType}
              onSelect={(value) => {
                setDocumentType(value);
                setSampledDocuments([]);
              }}
            />
            {(documentType === "MyKad"
              ? ["Front", "Back"]
              : ["Photo Page"]
            ).map((side) => {
              const key = `${documentType} ${side}`;
              const selected = sampledDocuments.includes(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`Select fictional ${key} sample photo`}
                  accessibilityState={{ selected }}
                  onPress={() =>
                    setSampledDocuments((current) =>
                      current.includes(key) ? current : [...current, key],
                    )
                  }
                  style={styles.samplePhotoTile}
                >
                  <Ionicons
                    name={selected ? "checkmark-circle" : "camera-outline"}
                    size={24}
                    color={selected ? colors.green : colors.blue}
                  />
                  <Text style={styles.verificationStageText}>
                    {documentType === "MyKad"
                      ? `${side} of MyKad`
                      : "Passport Photo Page"}
                  </Text>
                  <Text style={s.caption}>
                    {selected ? "Sample photo added (Demo)" : "Tap to select sample"}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.verificationStage}>
              <Ionicons name="scan-outline" size={22} color={colors.blue} />
              <Text style={styles.verificationStageText}>
                Face Verification — Simulated face scan
              </Text>
            </View>
            {(() => {
              const requiredSamples =
                documentType === "MyKad"
                  ? ["MyKad Front", "MyKad Back"]
                  : ["Passport Photo Page"];
              const documentsReady = requiredSamples.every((item) =>
                sampledDocuments.includes(item),
              );
              return (
                <Button
                  disabled={!documentsReady || scanningFace}
                  onPress={async () => {
                    setScanningFace(true);
                    try {
                      await new Promise((resolve) => setTimeout(resolve, 900));
                      await verify("verified");
                    } finally {
                      setScanningFace(false);
                    }
                  }}
                >
                  {scanningFace
                    ? "Scanning…"
                    : "Start Demo Face Scan"}
                </Button>
              );
            })()}
          </>
        )}
      </Card>
      </View>

      {/* Rental Risk Score Section */}
      <Card style={[styles.compactCard, styles.riskCard]}>
        <View style={styles.cardHeading}>
          <View style={styles.headingIcon}><Ionicons name="stats-chart" size={21} color={colors.blue} /></View>
          <Text style={[styles.cardTitle, { flex: 1 }]}>Rental Risk Score</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Learn more about the Rental Risk Score" onPress={() => router.push("/rental-risk-score")} style={styles.learnMore}><Text style={styles.learnMoreText}>Learn more</Text><Ionicons name="information-circle-outline" size={19} color={colors.blue} /></Pressable>
        </View>
        <View style={[styles.riskBody, narrow && styles.riskBodyNarrow]}>
          <View style={isMobile && !narrow ? styles.compactGauge : styles.fullGauge}>
            <View style={isMobile && !narrow ? styles.scaledGauge : undefined}><RiskGauge score={risk.score} label={risk.label} /></View>
          </View>
          <View style={styles.riskDetails}>
            <Text style={styles.riskExplanation}>
              CurRENT Rental Risk Score is a platform reliability metric, NOT a consumer credit score. It transparently determines your refundable security deposit tier and booking permissions.
            </Text>
            <View style={styles.riskMetricRow}><Ionicons name="star" size={11} color={colors.navy} /><Text style={styles.riskMetricLabel}>Initial verified score</Text><Text style={styles.riskMetricValue}>80 (Low Risk)</Text></View>
            <View style={styles.riskMetricRow}><Ionicons name="wallet" size={11} color={colors.navy} /><Text style={styles.riskMetricLabel}>Deposit basis</Text><Text style={styles.riskMetricValue}>{risk.score === null ? "N/A" : risk.score >= 80 ? "5% (capped at RM500)" : risk.score >= 40 ? "10% (capped at RM1,000)" : risk.score >= 30 ? "15% (capped at RM1,500)" : "Platform assessment required"}</Text></View>
            <View style={styles.riskMetricRow}><Ionicons name="calendar" size={11} color={colors.navy} /><Text style={styles.riskMetricLabel}>{completed} completed rentals</Text><Text style={styles.riskMetricValue}>+{netPoints} points</Text></View>
          </View>
        </View>
      </Card>

      {/* Trust and Support */}
      <View style={styles.supportList}>
        <View style={styles.supportHeading}><View style={styles.headingIcon}><Ionicons name="headset" size={21} color={colors.blue} /></View><Text style={styles.cardTitle}>Trust and Support</Text></View>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/how-it-works")}
          style={({ hovered, pressed }) => [styles.supportNavCard, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons name="bulb-outline" size={15} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>How CurRENT Works</Text>
            <Text style={styles.supportNavDesc}>
              A simple 4-step way to rent peer-to-peer
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/trust")}
          style={({ hovered, pressed }) => [styles.supportNavCard, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color={colors.blue}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>Trust</Text>
            <Text style={styles.supportNavDesc}>
              Confidence and protection built into the journey
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/faq")}
          style={({ hovered, pressed }) => [styles.supportNavCard, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons
              name="help-circle-outline"
              size={15}
              color={colors.blue}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>FAQ</Text>
            <Text style={styles.supportNavDesc}>
              Frequently asked questions and answers
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/support/customer-service")}
          style={({ hovered, pressed }) => [styles.supportNavCard, hovered && styles.supportNavHovered, pressed && styles.supportNavPressed]}
        >
          <View style={styles.supportNavIconWrap}>
            <Ionicons name="headset-outline" size={15} color={colors.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportNavTitle}>Customer Service</Text>
            <Text style={styles.supportNavDesc}>
              CurRENT Assistant · Automated Support & Human Handoff
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.muted} />
        </Pressable>
      </View>

      {/* Sign Out */}
      <Pressable
        accessibilityLabel="Sign out"
        accessibilityRole="button"
        style={({ pressed }) => [styles.signOutButton, pressed && styles.supportNavPressed]}
        onPress={async () => {
          try {
            await closeAuthenticatedWorkspace();
            if (isSupabaseConfigured && supabase) {
              await signOutAuthenticatedAccount(supabase.auth);
            }
            act({ type: "login", userId: null });
            router.replace("/(tabs)");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <Ionicons name="log-out-outline" size={16} color={colors.danger} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mobileContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 100 },
  desktopContent: { maxWidth: 860, paddingBottom: 68 },
  dashboardHeader: { marginBottom: 16 },
  dashboardTitle: { color: colors.navy, fontSize: 27, lineHeight: 32, fontWeight: "800", letterSpacing: -0.7 },
  dashboardSubtitle: { color: colors.slate, fontSize: 14, lineHeight: 20 },
  profileCard: { padding: 16, gap: 12, marginBottom: 12, backgroundColor: colors.white, borderColor: colors.border, borderRadius: 20 },
  profileRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.softBlue, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 28, fontWeight: "800", color: colors.navy },
  profileName: { fontSize: 17, lineHeight: 21, fontWeight: "800", color: colors.navy },
  profileEmail: { fontSize: 12, lineHeight: 16, marginTop: 1, flexShrink: 1 },
  profileBadge: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start", backgroundColor: colors.paleBlue, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginTop: 4 },
  profileBadgeVerified: { backgroundColor: "#E7F6EC" },
  profileBadgeText: { fontSize: 11, color: colors.blue, fontWeight: "700", textTransform: "capitalize" },
  profileBadgeTextVerified: { color: colors.green },
  demoDisclosure: { color: colors.slate, fontSize: 10, lineHeight: 14, marginTop: 4 },
  editButton: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: colors.blue, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8, alignSelf: "flex-start", cursor: "pointer" },
  editButtonText: { color: colors.blue, fontSize: 10, fontWeight: "700" },
  lenderButton: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.blue, borderRadius: 17, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, minHeight: 68, overflow: "hidden", cursor: "pointer" },
  lenderAccent: { position: "absolute", width: 240, height: 120, borderRadius: 120, right: -65, bottom: -82, backgroundColor: colors.softBlue, opacity: 0.13 },
  lenderIcon: { width: 43, height: 43, borderRadius: 12, backgroundColor: colors.mediumBlue, alignItems: "center", justifyContent: "center" },
  lenderTitle: { color: colors.white, fontSize: 17, fontWeight: "700" },
  lenderSubtitle: { color: colors.white, fontSize: 11, lineHeight: 15 },
  compactCard: { padding: 16, gap: 10, marginBottom: 12, borderRadius: 19 },
  riskCard: { backgroundColor: colors.paleBlue, borderColor: colors.softBlue },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 3 },
  headingIcon: { width: 41, height: 41, borderRadius: 12, backgroundColor: colors.softBlue, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: colors.navy, fontSize: 16, fontWeight: "800" },
  cardSubtitle: { color: colors.slate, fontSize: 12, lineHeight: 17 },
  stageIcon: { width: 39, height: 39, borderRadius: 10, backgroundColor: colors.paleBlue, alignItems: "center", justifyContent: "center" },
  stageSubtitle: { color: colors.slate, fontSize: 11, lineHeight: 15 },
  completedBadge: { color: colors.green, backgroundColor: "#E7F6EC", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, fontSize: 10, fontWeight: "700" },
  learnMore: { flexDirection: "row", alignItems: "center", gap: 3, cursor: "pointer" },
  learnMoreText: { color: colors.blue, fontSize: 11, fontWeight: "700" },
  riskBody: { flexDirection: "row", gap: 10, alignItems: "center" },
  riskBodyNarrow: { flexDirection: "column", alignItems: "stretch" },
  compactGauge: { width: 145, height: 135, overflow: "hidden", justifyContent: "center" },
  scaledGauge: { width: 190, left: -23, top: -5, transform: [{ scale: 0.75 }] },
  fullGauge: { alignItems: "center" },
  riskDetails: { flex: 1, minWidth: 0, gap: 5 },
  riskExplanation: { color: colors.slate, fontSize: 10, lineHeight: 14, marginBottom: 5 },
  riskMetricRow: { flexDirection: "row", alignItems: "center", gap: 4, borderTopWidth: 1, borderTopColor: colors.border, minHeight: 26 },
  riskMetricLabel: { color: colors.navy, fontSize: 9, fontWeight: "600", flex: 1 },
  riskMetricValue: { color: colors.navy, fontSize: 9, fontWeight: "800", textAlign: "right", flexShrink: 1 },
  signOutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 46, backgroundColor: "#FFF0ED", borderWidth: 1, borderColor: colors.danger, borderRadius: 10, marginTop: 12, marginBottom: 16, cursor: "pointer" },
  signOutText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  verificationStage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 9,
  },
  verificationStageFirst: { borderBottomWidth: 1, borderBottomColor: colors.border },
  verificationStageText: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  samplePhotoTile: {
    minHeight: 76,
    marginTop: 10,
    padding: 12,
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.blue,
    backgroundColor: colors.paleBlue,
    borderRadius: 12,
  },
  supportList: { backgroundColor: colors.white, borderRadius: 19, borderWidth: 1, borderColor: colors.border, overflow: "hidden", marginTop: 4 },
  supportHeading: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 8 },
  supportNavCard: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  supportNavHovered: { backgroundColor: colors.paleBlue },
  supportNavPressed: { opacity: 0.82 },
  supportNavIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.paleBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  supportNavTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.navy,
  },
  supportNavDesc: {
    fontSize: 10,
    color: colors.slate,
  },
});
